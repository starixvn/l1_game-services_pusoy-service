import { Hand } from "@rd/pusoy-rules";
import { IRound } from "../models/rounds";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import mongoose from "mongoose";
import GameData from "../game-data";
import { isSameCards } from "../helpers";

type SubmitPayload = {
    playerId: string;
    playerName: string;
    hand: Hand<number[]>;
    roundId: number;
    submit: boolean;
};
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

    async consume(data: SubmitPayload) {
        const { playerName, hand, roundId, submit, playerId } = data;
        const tableData = this.gameData.ingame[playerName];

        const currentRound = await this.roundsRepository.findOne({ id: roundId }).lean().exec();

        if (!tableData?.realPlayerSubmitted && currentRound && isSameCards(currentRound.result[0].hand, hand)) {
            tableData.result[playerId].hand = currentRound.result[0].hand;

            if (submit) {
                currentRound.result[0] = {
                    ...currentRound.result[0],
                    hand,
                    time: new Date(),
                };
                tableData.realPlayerSubmitted = true;
                ++tableData.numberOfSubmittedHands;
                await this.roundsRepository.updateOne({ id: roundId }, currentRound);
            }
        }
    }
}
