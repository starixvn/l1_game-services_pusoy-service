import { TableProcessBetQueue } from "sc-game-base/src/table/crons";
import GameData, { RealPlayer, RoundOfTable } from "../game-data";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { BetPayload } from "../consumers/place-bet-consumer";
import GameDefinition from "../game-definition";
import { PlaceBetPublisher } from "sc-game-base/src/core/event-publishers";
import { logger } from "sc-common";
import mongoose from "mongoose";
import BaseMetrics from "sc-game-base/src/core/base-metrics";
import * as Helper from "../helpers";
import { NUMBER_OF_DEAL_HAND } from "../constants";
import { RoundResultPublisher } from "../publishers";
import { DealtRoundInfo } from "../publishers/round-result-publisher";

export default class ProcessBetQueue extends TableProcessBetQueue {
    roundsRepository: mongoose.Model<any>;
    roundResultPublisher: RoundResultPublisher;

    declare gameData: GameData;
    declare definition: GameDefinition;

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
        roundResultPublisher,
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
        roundResultPublisher: RoundResultPublisher;
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
        this.roundResultPublisher = roundResultPublisher;
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

        if (this.gameData.disabled) {
            this.placeBetPublisher.publishToUser(player.UID, { um: this.gameData.disabled, um_message: this.gameData.umMessages });
            return;
        }

        if (tableData.roundData || !player.session) {
            this.placeBetPublisher.publishGameFailedBet(player.UID, { endBet: -1 });
            return;
        }

        if (tableData.botsInTable.length < 1) {
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

        await this.insertBet(player, roundId, bet, rate);

        // callAndForget(
        //     this.gameManagementApiClient.users.setBalanceAndDecreaseScoins({
        //         id: player.UID,
        //         balance: balance.red,
        //         deductionscoins: 0,
        //     })
        // );

        this.notifyPlacingBetResult(player, balance, bet, rate);

        if (player.profile.minBet !== balance.minBet || player.profile.maxBet !== balance.maxBet) {
            this.updateUserStakeLevel(player, balance.minBet, balance.maxBet);
        }

        await this.handleStartNewRound(player);
    }

    initNewRound(player: RealPlayer, payload: BetPayload) {
        const durations = this.definition.durations;
        const tableData = this.gameData.ingame[player.profile.name];

        tableData.socketId = player.UID;
        tableData.playerId = player.session.playerId;

        tableData.roundData = {
            remainingTime: durations.timeline.deal,
            showingResultTime: 0,
            roundId: this.gameData.roundId,
            otherPlayers: tableData.botsInTable.slice(0, NUMBER_OF_DEAL_HAND - 1),
            result: {} as any,
            submittedPlayers: [],
            realPlayerSubmitted: false,
        };

        payload.roundId = this.gameData.roundId;

        this.gameData.roundId++;
    }

    async handleStartNewRound(player: RealPlayer) {
        this.dealHandsAndPublish(player);

        await this.updateHandResultToDatabase(player.profile.name);
    }

    dealHandsAndPublish(player: RealPlayer) {
        const tableData = this.gameData.ingame[player.profile.name];
        const currentRound = tableData.roundData as RoundOfTable;
        const numberOfPlayers = currentRound.otherPlayers.length + 1;

        let hands = [];

        if (
            this.gameData.settlementResultFromAdmin?.result?.playerName === player.profile.name &&
            this.gameData.settlementResultFromAdmin.result?.hands
        ) {
            hands = [...this.gameData.settlementResultFromAdmin.result?.hands];
            this.gameData.settlementResultFromAdmin = undefined;
        } else {
            hands = Helper.dealHands(numberOfPlayers);
        }

        const playerHand = {
            hand: hands[0],
            playerId: player.session.playerId,
            slot: 0,
            time: new Date(),
        };

        currentRound.result[player.session.playerId] = playerHand;

        currentRound.otherPlayers.forEach((bot, index) => {
            const botHand = {
                hand: hands[index + 1],
                playerId: bot.id,
                slot: index + 1,
                time: new Date(),
            };

            currentRound.result[bot.id] = botHand;
        });

        const dealtHandsInfo: DealtRoundInfo = {
            socketId: tableData.socketId,
            playerHand,
            roundId: currentRound.roundId,
            otherPlayers: currentRound.otherPlayers,
        };

        this.roundResultPublisher.publishPusoyRound(dealtHandsInfo);
    }

    async updateHandResultToDatabase(tableName: string) {
        const tableData = this.gameData.ingame[tableName];
        const roundData = tableData.roundData as RoundOfTable;

        const filter = { id: roundData.roundId };

        const result = roundData.result;

        const round = {
            id: roundData.roundId,
            result: result,
            time: new Date(),
            exchangeRateId: this.gameData.exchangeRates.exId,
        };

        await this.roundsRepository.findOneAndUpdate(filter, round, { upsert: true }).exec();
    }

    async insertBet(player: RealPlayer, roundId: number, bet: BetPayload, rate: number) {
        const newBet = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            roundId,
            totalAmount: bet.amount,
            siteId: player.session.siteId,
            currency: player.session.currencyName,
            rate: rate,
            operatorId: player.session.operatorId,
            playerId: player.session.playerId,
        } as any;

        await this.betsRepository.create(newBet);

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
