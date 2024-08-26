import { RealPlayer } from "./../game-data";
import GameData from "../game-data";
import mongoose from "mongoose";
import { ISurvey } from "../models/survey";

export type SurveyPayload = {
    wishToPlayWithRealMoney: boolean;
};

export default class SurveyConsumer {
    declare gameData: GameData;
    surveyRepository: mongoose.Model<ISurvey>;

    constructor(gameData: GameData, surveyRepository: mongoose.Model<ISurvey>) {
        this.gameData = gameData;
        this.surveyRepository = surveyRepository;
    }

    async consume(socketClient: any, payload: SurveyPayload) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];

        if (realPlayer) {
            this.updateSurvey(realPlayer, payload);
        }
    }

    async updateSurvey(realPlayer: RealPlayer, payload: SurveyPayload) {
        const filter = { playerId: realPlayer.session.playerId };

        const survey = {
            playerId: realPlayer.session.playerId,
            playerName: realPlayer.profile.name,
            wishToPlayWithRealMoney: payload.wishToPlayWithRealMoney,
        };

        await this.surveyRepository.findOneAndUpdate(filter, survey, { upsert: true }).exec();
    }
}
