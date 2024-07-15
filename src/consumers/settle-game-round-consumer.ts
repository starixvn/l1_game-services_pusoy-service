import { HandResult, IRound, Settlement } from "../models/rounds";
import mongoose from "mongoose";
import { Hand, Natural, Settlement as RawSettlement } from "@rd/pusoy-rules";
import GameDefinition, { Duration } from "../game-definition";
import GameData from "../game-data";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    declare roundsRepository: mongoose.Model<IRound>;
    declare gameData: GameData;
    declare definition: GameDefinition;

    async settleTable(playerName: string) {
        const tableData = this.gameData.ingame[playerName];
        if (!tableData) {
            return 0;
        }

        const round = tableData.roundData;
        if (!round) {
            return 0;
        }

        const hands: Hand<number[]>[] = [];
        const handResult: HandResult[] = [];
        Object.values(round.result).forEach((item) => {
            hands.push(item.hand);
            handResult.push(item);
        });

        const settlement = this.definition.settle(hands) as RawSettlement[];
        const settlementResult: Record<string, Settlement> = {};
        const settleEffectDuration = {
            natural: 0,
            fullPusoy: 0,
            crack: 0,
            mini: 0,
        };
        const miniPusoySet: Set<string> = new Set();
        const durations = this.definition.durations as Duration;

        for (let i = 0; i < settlement.length; i++) {
            settlementResult[handResult[i].playerId] = {
                ...settlement[i],
                time: new Date(),
                playerId: handResult[i].playerId,
            };
            if (settlement[i].natural.name !== Natural.Unknown) {
                settleEffectDuration.natural = durations.settleAnimation.natural;
            }
            if (settlement[i].pusoy.full > 0) {
                settleEffectDuration.fullPusoy = durations.settleAnimation.pusoy.full;
            }
            if (settlement[i].crack.isCrack) {
                settleEffectDuration.crack = durations.settleAnimation.crack;
            }
            if (settlement[i].pusoy.mini) {
                Object.entries(settlement[i].pusoy.mini).forEach(([key, value]) => {
                    if (value > 0) {
                        miniPusoySet.add(key);
                    }
                });
            }
        }

        settleEffectDuration.mini = miniPusoySet.size * durations.settleAnimation.pusoy.mini;
        const totalSettleEffectDuration = Object.values(settleEffectDuration).reduce((a, b) => a + b, 0);

        await this.roundsRepository.updateOne({ id: tableData.roundData!.roundId }, { settlementResult: settlementResult }).exec();

        this.roundResultPublisher.publishRoundResult({ roundId: tableData.roundData!.roundId, settlementResult: settlementResult });

        return totalSettleEffectDuration;
    }
}
