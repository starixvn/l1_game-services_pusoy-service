import { Hand } from "@rd/pusoy-rules";
import { IRound } from "../models/rounds";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import mongoose from "mongoose";
import GameData, { BotInRound, RoundOfTable, TableInGame } from "../game-data";
import { isSameCards } from "../helpers";
import { Core } from "sc-game-base";
import GameDefinition from "../game-definition";

export type SubmitPayload = {
    playerId: string;
    playerName: string;
    hand: Hand<number[]>;
    roundId: number;
    submit: boolean;
};

export type RearrangePayload = {
    playerId: string;
    playerName: string;
};

export default class SubmitArrangementConsumer {
    settleGameRoundConsumer: SettleGameRoundConsumer;
    roundsRepository: mongoose.Model<IRound>;
    roundIdConsumer: any;
    gameData: GameData;
    publisher: Core.BaseEventPublishers.BaseEventPublisher;
    gameDefinition: GameDefinition;

    constructor(
        settleGameRoundConsumer: SettleGameRoundConsumer,
        roundsRepository: mongoose.Model<IRound>,
        gameData: GameData,
        publisher: Core.BaseEventPublishers.BaseEventPublisher,
        gameDefinition: GameDefinition
    ) {
        this.roundsRepository = roundsRepository;
        this.settleGameRoundConsumer = settleGameRoundConsumer;
        this.gameData = gameData;
        this.publisher = publisher;
        this.gameDefinition = gameDefinition;
    }

    async consume(data: SubmitPayload) {
        const tableData = this.gameData.ingame[data.playerName];
        const currentRound = tableData.roundData as RoundOfTable;
        const isValidSubmit = this.isValidSubmit(data);

        if (isValidSubmit) {
            currentRound.result[data.playerId].hand = data.hand;
            currentRound.result[data.playerId].time = new Date();

            if (data.submit) {
                const playerInfo = {
                    id: data.playerId,
                    name: data.playerName,
                } as BotInRound;

                currentRound.realPlayerSubmitted = true;
                currentRound.submittedPlayers.push(playerInfo);

                this.publisher.publishToUser(tableData.socketId, {
                    submittedPlayer: playerInfo,
                });

                await this.updatePlayerHandResultToDatabase(tableData, data.playerId);
            }
        } else {
            this.publisher.publishToUser(tableData.socketId, { validSubmitted: false });
        }
    }

    consumeRearrangeCards(data: { playerId: string; playerName: string }) {
        const tableData = this.gameData.ingame[data.playerName];
        const currentRound = tableData.roundData as RoundOfTable;
        let canRearrange = false;

        if (currentRound.remainingTime <= this.gameDefinition.durations.timeline.arrangement && currentRound.remainingTime > 0) {
            currentRound.submittedPlayers = currentRound.submittedPlayers.filter((player) => player.id !== data.playerId);
            currentRound.realPlayerSubmitted = false;
            canRearrange = true;
        }

        this.publisher.publishToUser(tableData.socketId, {
            rearrangePlayer: {
                playerId: data.playerId,
                playerName: data.playerName,
                canRearrange: canRearrange,
            },
        });
    }

    isValidSubmit(data: SubmitPayload) {
        const tableData = this.gameData.ingame[data.playerName];
        const currentRound = tableData.roundData as RoundOfTable;

        return (
            data.roundId === currentRound.roundId &&
            data.playerId === tableData.playerId &&
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
