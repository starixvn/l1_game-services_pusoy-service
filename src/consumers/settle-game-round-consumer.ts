import { Core } from "sc-game-base";
import { IRound } from "../models/rounds";
import mongoose from "mongoose";
import { Hand } from "@rd/pusoy-rules";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    declare roundsRepository: mongoose.Model<IRound>;

    async settleTable(playerName: string) {
        const betTrack = this.gameData.ingame[playerName].betTracks;

        if (!betTrack) {
            return;
        }

        const round = await this.roundsRepository.findOne({ id: betTrack.roundId }).lean().exec();

        if (!round) {
            return;
        }

        const hands: Hand<number[]>[] = [];
        const playerIds: string[] = [];
        round.result.forEach((settlement) => {
            hands.push(settlement.hand);
            playerIds.push(settlement.playerId);
        });
        const settlementResult = this.definition.settle(hands) as [];
        for (let i = 0; i < settlementResult.length; i++) {
            Object.assign(settlementResult[i], { playerId: playerIds[i] });
        }

        await this.roundsRepository.updateOne({ id: betTrack.roundId }, { settlementResult: settlementResult }).exec();

        delete this.gameData.ingame[playerName];
        this.roundResultPublisher.publishRoundResult({ roundId: betTrack.roundId, settlementResult: settlementResult });
    }
}
