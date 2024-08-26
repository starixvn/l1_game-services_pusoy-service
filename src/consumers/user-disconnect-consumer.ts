import { RealPlayer } from "./../game-data";
import Bot from "../crons/bot";
import GameData, { TableInGame } from "../game-data";
import { Core } from "sc-game-base";
import mongoose from "mongoose";
import { ISurvey } from "../models/survey";

export default class UserDisconnectConsumer extends Core.BaseEventConsumers.UserDisconnectConsumer {
    declare gameData: GameData;
    bot: Bot;
    surveyRepository: mongoose.Model<ISurvey>;

    constructor(gameData: GameData, bot: Bot, surveyRepository: mongoose.Model<ISurvey>) {
        super(gameData);
        this.gameData = gameData;
        this.bot = bot;
        this.surveyRepository = surveyRepository;
    }

    async consume(socketClient: any) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];

        if (realPlayer) {
            const tableData = this.gameData.ingame[realPlayer.profile.name];

            this.updateSurvey(realPlayer);
            this.updateOrDeleteTable(tableData);
            super.consume(socketClient);
        }
    }

    async updateOrDeleteTable(tableData: TableInGame) {
        if (tableData) {
            if (!tableData.roundData) {
                await this.bot.removeAllBotsFromTable(tableData);
                delete this.gameData.ingame[tableData.name];
            } else {
                tableData.canDestroy = true;
                tableData.socketId = "";
            }
        }
    }

    async updateSurvey(realPlayer: RealPlayer) {
        const filter = { playerId: realPlayer.session.playerId };

        const survey = { playerId: realPlayer.session.playerId, playerName: realPlayer.profile.name };

        await this.surveyRepository.updateOne(filter, { $setOnInsert: survey }, { upsert: true });
    }
}
