import { IRound } from "../models/rounds";
import mongoose, { Model } from "mongoose";
import { Hand, Natural, Settlement } from "@rd/pusoy-rules";
import GameDefinition, { Duration } from "../game-definition";
import GameData from "../game-data";
import { Core } from "sc-game-base";
import { RoundResultPublisher, UserBetResultPublisher } from "sc-game-base/src/core/event-publishers";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    declare roundsRepository: mongoose.Model<IRound>;
    declare gameData: GameData;
    declare definition: GameDefinition;

    constructor({
        definition,
        gameData,
        roundResultPublisher,
        userBetResultPublisher,
        endGame,
        roundsRepository,
        betsRepository,
        gameManagementApiClientFactory,
    }: {
        definition: GameDefinition;
        gameData: GameData;
        roundResultPublisher: RoundResultPublisher;
        userBetResultPublisher: UserBetResultPublisher;
        endGame: any;
        roundsRepository: Model<any>;
        betsRepository: Model<any>;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
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
    }

    async settleTable(playerName: string) {
        const durations = this.definition.durations as Duration;
        const tableData = this.gameData.ingame[playerName];
        if (!tableData) {
            return 0;
        }

        const round = await this.roundsRepository.findOne({ id: tableData.roundData!.roundId }).lean().exec();
        if (!round) {
            return 0;
        }

        const hands: Hand<number[]>[] = [];
        const playerIds: string[] = [];
        round.result.forEach((settlement) => {
            hands.push(settlement.hand);
            playerIds.push(settlement.playerId);
        });
        const settlement = this.definition.settle(hands) as Settlement[];
        const settlementResult = [];
        const settleEffectDuration = {
            natural: 0,
            fullPusoy: 0,
            crack: 0,
            mini: 0,
        };
        const miniPusoySet: Set<string> = new Set();
        for (let i = 0; i < settlement.length; i++) {
            settlementResult.push({
                ...settlement[i],
                time: new Date(),
                playerId: playerIds[i],
            });
            if (settlement[i].natural.name !== Natural.Unknown) {
                settleEffectDuration.natural = durations.settleEffect.natural;
            }
            if (settlement[i].pusoy.full > 0) {
                settleEffectDuration.fullPusoy = durations.settleEffect.pusoy.full;
            }
            if (settlement[i].crack.isCrack) {
                settleEffectDuration.crack = durations.settleEffect.crack;
            }
            if (settlement[i].pusoy.mini) {
                Object.entries(settlement[i].pusoy.mini).forEach(([key, value]) => {
                    if (value > 0) {
                        miniPusoySet.add(key);
                    }
                });
            }
        }

        settleEffectDuration.mini = miniPusoySet.size * durations.settleEffect.pusoy.mini;
        const totalSettleEffectDuration = Object.values(settleEffectDuration).reduce((a, b) => a + b, 0);

        await this.roundsRepository.updateOne({ id: tableData.roundData!.roundId }, { settlementResult: settlementResult }).exec();

        this.roundResultPublisher.publishRoundResult({ roundId: tableData.roundData!.roundId, settlementResult: settlement });

        return totalSettleEffectDuration;
    }
}
