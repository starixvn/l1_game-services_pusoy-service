import { Hand } from "@rd/pusoy-rules";
import { IRound } from "../models/rounds";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import mongoose from "mongoose";
import GameData from "../game-data";
import { isSameCards } from "../helpers";

export default class SubmitArrangementConsumer {
    settleRoundResultConsumer: SettleGameRoundConsumer;
    roundsRepository: mongoose.Model<IRound>;
    roundIdConsumer: any;
    gameData: GameData;

    constructor(settleRoundResultConsumer: SettleGameRoundConsumer, roundsRepository: mongoose.Model<IRound>, gameData: GameData) {
        this.roundsRepository = roundsRepository;
        this.settleRoundResultConsumer = settleRoundResultConsumer;
        this.gameData = gameData;
    }

    async consume(data: { playerName: string; hand: Hand<number[]>; roundId: number; submit: boolean }) {
        const { playerName, hand, roundId, submit } = data;

        if (this.gameData.ingame[playerName].submitTed) {
            return;
        }

        const result = {
            hand,
            time: new Date(),
        };

        const currentRound = await this.roundsRepository.findOne({ id: roundId }).lean().exec();
        if (currentRound && isSameCards(currentRound.result[0].hand, hand)) {
            this.gameData.ingame[playerName].hand = hand;
            if (submit) {
                currentRound.result[0] = {
                    ...currentRound.result[0],
                    ...result,
                };
                this.gameData.ingame[playerName].submitTed = true;
                await this.roundsRepository.updateOne({ id: roundId }, currentRound);
            }
            return;
        }
    }
}
