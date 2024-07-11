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
        const tableData = this.gameData.ingame[data.playerName];
        const currentRound = tableData.betTracks[data.roundId];
        const isValidSubmit = this.isValidSubmit(data);

        if (isValidSubmit) {
            currentRound.result[data.playerId].hand = data.hand;

            if (data.submit) {
                currentRound.realPlayerSubmitted = true;
                ++currentRound.numberOfSubmittedHands;

                // await this.updateHandResultToDatabase(tableName);
            }
        }
    }

    isValidSubmit(data: SubmitPayload) {
        const tableData = this.gameData.ingame[data.playerName];
        const currentRound = tableData?.betTracks[data.roundId];

        return (
            data.roundId === tableData.roundId &&
            currentRound &&
            !currentRound.realPlayerSubmitted &&
            isSameCards(currentRound.result[data.playerId].hand, data.hand)
        );
    }
}
