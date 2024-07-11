import { dealHands } from "./../helpers/deal-hands";
import { TableProcessBetQueue } from "sc-game-base/src/table/crons";
import GameData from "../game-data";
import { RealPlayer } from "../type/real-player";
import GameManagementApiClientFactory, { callAndForget } from "sc-game-base/src/core/game-management-api";
import { BetPayload } from "../consumers/place-bet-consumer";
import GameDefinition from "../game-definition";
import { PlaceBetPublisher } from "sc-game-base/src/core/event-publishers";
import { logger } from "sc-common";
import mongoose from "mongoose";
import BaseMetrics from "sc-game-base/src/core/base-metrics";
import * as Helper from "../helpers";

export default class ProcessBetQueue extends TableProcessBetQueue {
    roundsRepository: mongoose.Model<any>;

    declare gameData: GameData;
    constructor({
        definition,
        gameData,
        placeBetPublisher,
        placeBet,
        logService,
        betsRepository,
        betLogsRepository,
        roundsRepository,
        gameManagementApiClientFactory,
        baseMetrics,
    }: {
        definition: GameDefinition;
        gameData: GameData;
        placeBetPublisher: PlaceBetPublisher;
        placeBet: any;
        logService: typeof logger;
        betsRepository: mongoose.Model<any>;
        betLogsRepository: mongoose.Model<any>;
        roundsRepository: mongoose.Model<any>;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
        baseMetrics: BaseMetrics;
    }) {
        super({
            definition,
            gameData,
            placeBetPublisher,
            placeBet,
            logService,
            betsRepository,
            betLogsRepository,
            gameManagementApiClientFactory,
            baseMetrics,
        });

        this.roundsRepository = roundsRepository;
    }

    formatApiBetInfo(payload: BetPayload) {
        return {
            amount: payload.amount,
            gameId: this.definition.id,
            gameRoundId: payload.roundId,
            clientSentTime: payload.time ?? new Date(),
            metadata: {
                mode: `${payload.mode}`,
            },
        };
    }

    async stubPlaceBet(payload: any, info: any) {
        return {
            isOk: true,
            response: {} as any,
        };
    }
    async proceedBet(player: RealPlayer, payload: BetPayload) {
        const tableData = this.gameData.ingame[player.profile.name];

        if (tableData.numberOfBots < 1) {
            tableData.betQueue.push({ player, payload });
            return;
        }

        this.initNewRound(player, payload);

        const betInfo = this.formatApiBetInfo(payload);
        const apiResult = await this.stubPlaceBet({ id: player.UID, session: player.session }, betInfo);
        const { response } = apiResult;

        // TODO: update place bet api
        if (apiResult.isOk) {
            await this.handleSuccessBet(player, response, betInfo.gameRoundId, payload);
        } else {
            this.handleFailedBet(player, response, payload);

            if (
                (player.profile.minBet !== response.apiError?.minBet || player.profile.maxBet !== response.apiError?.maxBet) &&
                response.apiError?.minBet > 0 &&
                response.apiError?.maxBet > 0
            ) {
                this.updateUserStakeLevel(player, response.apiError.minBet, response.apiError.maxBet);
            }
        }

        const totalProcessedTime = (new Date().valueOf() - payload.receivedTime.valueOf()) / 1000;
        this.baseMetrics.collectBetProcessedTime(totalProcessedTime);
    }

    async handleSuccessBet(player: RealPlayer, balance: any, roundId: number, bet: BetPayload) {
        const rate = this.calculateCurrencyRate(player.session);

        if (this.betLogsRepository) {
            await this.insertBetLog(player, roundId, bet, rate);
        }

        await this.upsertBet(player, roundId, bet, rate);

        callAndForget(
            this.gameManagementApiClient.users.setBalanceAndDecreaseScoins({
                id: player.UID,
                balance: balance.red,
                deductionscoins: 0,
            })
        );

        this.notifyPlacingBetResult(player, balance, bet, rate);

        if (player.profile.minBet !== balance.minBet || player.profile.maxBet !== balance.maxBet) {
            this.updateUserStakeLevel(player, balance.minBet, balance.maxBet);
        }

        await this.handleStartNewRound(player, roundId);
    }

    initNewRound(player: RealPlayer, payload: BetPayload) {
        const tableData = this.gameData.ingame[player.profile.name];
        const currentRound = tableData.betTracks[tableData.roundId];

        tableData.userId = player.UID;
        tableData.playerId = player.session.playerId;
        tableData.roundId = this.gameData.roundId;
        tableData.canBotLeave = false;

        currentRound.id = this.gameData.roundId;
        currentRound.numberOfSubmittedHands = 0;

        payload.roundId = this.gameData.roundId;

        this.gameData.roundId++;
    }

    async handleStartNewRound(player: RealPlayer, roundId: number) {
        this.dealHandsAndPublish(player, roundId);

        await this.updateHandResultToDatabase(player.profile.name, roundId);
    }

    dealHandsAndPublish(player: RealPlayer, roundId: number) {
        const tableData = this.gameData.ingame[player.profile.name];
        const currentRound = tableData.betTracks[roundId];
        const numberOfPlayers = currentRound.otherPlayers.length + 1;

        const hands = Helper.dealHands(numberOfPlayers);

        const playerHand = {
            hand: hands[0],
            playerId: player.session.playerId,
        };

        currentRound.result[player.session.playerId] = playerHand;

        currentRound.otherPlayers.forEach((bot, index) => {
            const botHand = {
                hand: hands[index + 1],
                playerId: bot.id,
            };

            currentRound.result[bot.id] = botHand;
        });

        this.placeBetPublisher.publishToUser(player.UID, { playerHand, roundId });
    }

    async updateHandResultToDatabase(tableName: string, roundId: number) {
        const tableData = this.gameData.ingame[tableName];
        const roundData = tableData.betTracks[roundId];

        const filter = { id: tableData.roundId };

        const result = [
            roundData.result[tableData.playerId],
            Object.values(roundData.result).filter((res) => res.playerId !== tableData.playerId),
        ];

        const round = {
            id: tableData.roundId,
            result: result,
            settlementResult: [],
            time: new Date(),
            exchangeRateId: this.gameData.exchangeRates.exId,
        };

        await this.roundsRepository.findOneAndUpdate(filter, round, { upsert: true });
    }

    async upsertBet(player: RealPlayer, roundId: number, bet: BetPayload, rate: number) {
        const newBet = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            roundId,
        } as any;

        const existingBetFilter = { uid: player.UID, roundId };

        const existingBetIncrement = {
            totalAmount: bet.amount,
        };

        if (player.session) {
            newBet.siteId = player.session.siteId;
            newBet.currency = player.session.currencyName;
            newBet.rate = rate;

            newBet.operatorId = player.session.operatorId;
            newBet.playerId = player.session.playerId;
        }

        await this.betsRepository.updateOne(
            existingBetFilter,
            { $inc: existingBetIncrement, $setOnInsert: newBet },
            { upsert: true, setDefaultsOnInsert: true }
        );

        return newBet.time;
    }

    async insertBetLog(player: RealPlayer, roundId: number, bet: BetPayload, rate: number) {
        const newBetLog = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            amount: bet.amount,
            clientSentTime: bet.clientSentTime,
            receivedTime: bet.receivedTime,
            roundId,
        } as any;

        if (player.session) {
            newBetLog.siteId = player.session.siteId;
            newBetLog.currency = player.session.currencyName;
            newBetLog.rate = rate;

            newBetLog.operatorId = player.session.operatorId;
            newBetLog.playerId = player.session.playerId;
        }

        await this.betLogsRepository.create(newBetLog);
    }
}
