import { IRound, Settlement } from "../models/rounds";
import mongoose from "mongoose";
import { Natural, Settlement as RawSettlement } from "@rd/pusoy-rules";
import GameDefinition, { Duration } from "../game-definition";
import GameData, { RoundOfTable, TableInGame } from "../game-data";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    declare roundsRepository: mongoose.Model<IRound>;
    declare gameData: GameData;
    declare definition: GameDefinition;

    async settleTable(tableData: TableInGame) {
        const round = tableData.roundData as RoundOfTable;

        const handResults = Object.values(round.result).sort((a, b) => a.slot - b.slot);

        const hands = handResults.map((handResult) => handResult.hand);

        const settlements = this.definition.settle(hands) as RawSettlement[];

        const settlementResult: Record<string, Settlement> = {};

        const settleEffectDuration = {
            natural: 0,
            fullPusoy: 0,
            crack: 0,
            mini: 0,
        };

        const miniPusoySet: Set<string> = new Set();
        const durations = this.definition.durations as Duration;

        settlements.forEach((settlement, index) => {
            settlementResult[handResults[index].playerId] = {
                ...settlement,
                playerId: handResults[index].playerId,
                slot: handResults[index].slot,
            };

            if (settlement.natural.name !== Natural.Unknown) {
                settleEffectDuration.natural = durations.settleAnimation.natural;
            }
            if (settlement.pusoy.full > 0) {
                settleEffectDuration.fullPusoy = durations.settleAnimation.pusoy.full;
            }
            if (settlement.crack.isCrack) {
                settleEffectDuration.crack = durations.settleAnimation.crack;
            }
            if (settlement.pusoy.mini) {
                Object.entries(settlement.pusoy.mini).forEach(([key, value]) => {
                    if (value > 0) {
                        miniPusoySet.add(key);
                    }
                });
            }
        });

        settleEffectDuration.mini = miniPusoySet.size * durations.settleAnimation.pusoy.mini;
        const totalSettleEffectDuration = Object.values(settleEffectDuration).reduce((a, b) => a + b, 0);

        await this.roundsRepository.updateOne({ id: round.roundId }, { settlementResult: settlementResult }).exec();

        this.roundResultPublisher.publishToUser(tableData.socketId, { roundId: round.roundId, settlementResult: settlementResult });

        return totalSettleEffectDuration;
    }
}
