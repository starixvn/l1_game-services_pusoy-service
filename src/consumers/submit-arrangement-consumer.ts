import { Hand } from "@rd/pusoy-rules";
import Round, { IRound } from "../models/rounds";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import mongoose from "mongoose";

export default class SubmitArrangementConsumer {
    settleRoundResultConsumer: SettleGameRoundConsumer;
    roundsRepository: mongoose.Model<IRound>;
    roundIdConsumer: any;

    constructor(settleRoundResultConsumer: SettleGameRoundConsumer, roundsRepository: mongoose.Model<IRound>) {
        this.roundsRepository = roundsRepository;
        this.settleRoundResultConsumer = settleRoundResultConsumer;
    }

    async consume(data: { playerName: string; hand: Hand<number[]>; roundId: number }) {
        const { playerName, hand, roundId } = data;

        const result = {
            hand,
            time: new Date(),
        };

        const currentRound = await this.roundsRepository.findOne({ id: roundId }).lean().exec();
        if (currentRound) {
            currentRound.result[0] = {
                ...currentRound.result[0],
                ...result,
            };
            await this.roundsRepository.updateOne({ id: roundId }, currentRound);

            await this.settleRoundResultConsumer.settleTable(playerName);

            await this.roundIdConsumer.increaseRoundId();
        }
    }
}
