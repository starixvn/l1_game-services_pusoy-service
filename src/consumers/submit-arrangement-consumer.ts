import { Hand } from "@rd/pusoy-rules";
import { IRound } from "../models/rounds";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import mongoose from "mongoose";
import GameData, { BotInRound, RoundOfTable, TableInGame } from "../game-data";
import { isSameCards } from "../helpers";

export type SubmitPayload = {
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
        const currentRound = tableData.roundData as RoundOfTable;
        const isValidSubmit = this.isValidSubmit(data);

        if (isValidSubmit) {
            currentRound.result[data.playerId].hand = data.hand;
            currentRound.result[data.playerId].time = new Date();

            if (data.submit) {
                currentRound.realPlayerSubmitted = true;
                currentRound.submittedPlayers.push({
                    id: data.playerId,
                    name: data.playerName,
                } as BotInRound);

                await this.updatePlayerHandResultToDatabase(tableData, data.playerId);
            }
        }
    }

    isValidSubmit(data: SubmitPayload) {
        const tableData = this.gameData.ingame[data.playerName];
        const currentRound = tableData.roundData as RoundOfTable;

        return (
            data.roundId === currentRound.roundId &&
            currentRound &&
            !currentRound.realPlayerSubmitted &&
            isSameCards(currentRound.result[data.playerId].hand, data.hand)
        );
    }

    async updatePlayerHandResultToDatabase(tableData: TableInGame, playerId: string) {
        const roundData = tableData.roundData as RoundOfTable;

        const filter = { id: roundData.roundId };

        const update = {
            [`result.${playerId}`]: roundData.result[playerId],
        };

        await this.roundsRepository.findOneAndUpdate(filter, update).exec();
    }
}
