import { IRound, Settlement } from "../models/rounds";
import mongoose from "mongoose";
import { Natural, Settlement as RawSettlement } from "@rd/pusoy-rules";
import GameDefinition from "../game-definition";
import GameData, { RoundOfTable, TableInGame } from "../game-data";
import { Core } from "sc-game-base";
import { RoundResultPublishInfo } from "../publishers/round-result-publisher";

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

        const durations = this.definition.durations;

        const settleEffectDuration = {
            natural: 0,
            fullPusoy: 0,
            crack: 0,
            mini: 0,
            normal: 0,
            chipFly: 0,
        };

        const miniPusoySet: Set<string> = new Set();
        let numberPlayersCrack = 0;
        let numberPlayersNatural = 0;

        settlements.forEach((settlement, index) => {
            settlementResult[handResults[index].playerId] = {
                ...settlement,
                playerId: handResults[index].playerId,
                slot: handResults[index].slot,
            };

            if (settlement.natural.name !== Natural.Unknown) {
                settleEffectDuration.natural = durations.animation.natural;
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
                Object.entries(settlement.pusoy.mini).forEach(([key, value]) => {
                    if (value > 0) {
                        miniPusoySet.add(key);
                    }
                });
            }
        });

        settleEffectDuration.mini = miniPusoySet.size * durations.animation.pusoy.mini;

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
}
