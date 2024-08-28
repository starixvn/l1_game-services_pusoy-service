import { IRound, Settlement } from "../models/rounds";
import mongoose from "mongoose";
import { Natural, Settlement as RawSettlement } from "@rd/pusoy-rules";
import GameDefinition from "../game-definition";
import GameData, { BotInRound, RoundOfTable, TableInGame } from "../game-data";
import { Core } from "sc-game-base";
import { RoundResultPublishInfo } from "../publishers/round-result-publisher";
import { RoundResultPublisher, UserBetResultPublisher } from "sc-game-base/src/core/event-publishers";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { IBot } from "../models/bots";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    declare roundsRepository: mongoose.Model<IRound>;
    declare gameData: GameData;
    declare definition: GameDefinition;
    botsRepository: mongoose.Model<IBot>;

    constructor({
        definition,
        gameData,
        roundResultPublisher,
        userBetResultPublisher,
        endGame,
        roundsRepository,
        betsRepository,
        gameManagementApiClientFactory,
        botsRepository,
    }: {
        definition: GameDefinition;
        gameData: GameData;
        roundResultPublisher: RoundResultPublisher;
        userBetResultPublisher: UserBetResultPublisher;
        endGame: any;
        roundsRepository: mongoose.Model<IRound>;
        betsRepository: mongoose.Model<any>;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
        botsRepository: mongoose.Model<IBot>;
    }) {
        super({
            definition,
            gameData,
            roundResultPublisher,
            userBetResultPublisher,
            endGame,
            roundsRepository,
            betsRepository,
            gameManagementApiClientFactory,
        });

        this.botsRepository = botsRepository;
    }

    async settleTable(tableData: TableInGame) {
        const round = tableData.roundData as RoundOfTable;

        const handResults = Object.values(round.result).sort((a, b) => a.slot - b.slot);

        const hands = handResults.map((handResult) => handResult.hand);

        const settlements = this.definition.settle(hands) as RawSettlement[];

        const settlementResult: Record<string, Settlement> = {};

        const durations = this.definition.durations;

        const settleEffectDuration = {
            natural: 0,
            fullPusoy: 0,
            crack: 0,
            mini: 0,
            normal: 0,
            chipFly: 0,
        };

        let isHavingMiniPusoy = false;
        let numberPlayersCrack = 0;
        let numberPlayersNatural = 0;

        settlements.forEach((settlement, index) => {
            if (settlement.natural.name !== Natural.Unknown) {
                settleEffectDuration.natural += durations.animation.natural;
                numberPlayersNatural += 1;
            }
            if (settlement.pusoy.full > 0) {
                settleEffectDuration.fullPusoy = durations.animation.pusoy.full;
            }
            if (settlement.crack.isCrack) {
                settleEffectDuration.crack = durations.animation.crack;
                numberPlayersCrack += 1;
            }
            if (settlement.pusoy.mini) {
                const mini: { [key: string]: number } = {};

                Object.entries(settlement.pusoy.mini).forEach(([key, value]) => {
                    const miniSlot = handResults[+key].slot;
                    mini[miniSlot] = value;
                    settlement.pusoy.mini = mini;

                    if (!isHavingMiniPusoy && value > 0) {
                        isHavingMiniPusoy = true;
                    }
                });
            }

            settlementResult[handResults[index].playerId] = {
                ...settlement,
                playerId: handResults[index].playerId,
                slot: handResults[index].slot,
            };

            this.updateBotScore(tableData, settlementResult[handResults[index].playerId]);

            this.updateBalance(tableData, settlementResult[handResults[index].playerId]);
        });

        settleEffectDuration.mini = isHavingMiniPusoy ? durations.animation.pusoy.mini : 0;

        settleEffectDuration.chipFly = durations.animation.chipFly;

        settleEffectDuration.normal =
            numberPlayersCrack === settlements.length - 1 || numberPlayersNatural === settlements.length - 1
                ? 0
                : durations.animation.normal;

        const totalSettleEffectDuration = Object.values(settleEffectDuration).reduce((a, b) => a + b, 0);

        await this.roundsRepository.updateOne({ id: round.roundId }, { settlementResult: settlementResult }).exec();

        const publishInfo: RoundResultPublishInfo = {
            socketId: tableData.socketId,
            roundId: round.roundId,
            settlementResult: settlementResult,
            settleEffectDuration: settleEffectDuration,
            result: round.result,
        };

        this.roundResultPublisher.publishRoundResult(publishInfo);

        return totalSettleEffectDuration;
    }

    async updateBotScore(tableData: TableInGame, settlementResult: Settlement) {
        const roundData = tableData.roundData as RoundOfTable;

        const filter = { roundId: roundData.roundId, botId: settlementResult.playerId };

        const update = {
            score: settlementResult.sum,
        };

        await this.botsRepository.findOneAndUpdate(filter, update).exec();
    }

    updateBalance(tableData: TableInGame, settlementResult: Settlement) {
        const roundData = tableData.roundData as RoundOfTable;

        const bot = roundData.otherPlayers.find((bot) => bot.id === settlementResult.playerId);

        if (bot) {
            bot.balance += settlementResult.sum;
        }

        if (tableData.playerId === settlementResult.playerId) {
            tableData.balance += settlementResult.sum;
        }
    }
}
