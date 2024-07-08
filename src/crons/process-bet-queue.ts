import { TableProcessBetQueue } from "sc-game-base/src/table/crons";
import GameData from "../game-data";
import { RealPlayer } from "../type/real-player";
import { callAndForget } from "sc-game-base/src/core/game-management-api";
import { BetPayload } from "../consumers/place-bet-consumer";

export default class ProcessBetQueue extends TableProcessBetQueue {
    declare gameData: GameData;

    formatApiBetInfo(payload: BetPayload) {
        return {
            stackLevel: payload.stackLevel,
            amount: payload.amount,
            gameId: this.definition.id,
            gameRoundId: payload.roundId,
            clientSentTime: payload.time ?? new Date(),
            metadata: {
                mode: `${payload.mode}`,
            },
        };
    }

    async proceedBet(player: RealPlayer, payload: BetPayload) {
        const betInfo = this.formatApiBetInfo(payload);
        const apiResult = await this.placeBet({ id: player.UID, session: player.session }, betInfo);
        const { response } = apiResult;

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

        await this.handleCreateNewRound(player, bet);
    }

    async handleCreateNewRound(player: RealPlayer, payload: BetPayload) {}

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
