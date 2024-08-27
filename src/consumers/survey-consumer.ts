import { RealPlayer } from "./../game-data";
import GameData from "../game-data";
import mongoose from "mongoose";
import { ISurvey } from "../models/survey";
import { Core } from "sc-game-base";

export type SurveyPayload = {
    wishToPlayWithRealMoney: boolean;
};

export default class SurveyConsumer {
    gameData: GameData;
    surveyRepository: mongoose.Model<ISurvey>;
    publisher: Core.BaseEventPublishers.BaseEventPublisher;

    constructor(gameData: GameData, surveyRepository: mongoose.Model<ISurvey>, publisher: Core.BaseEventPublishers.BaseEventPublisher) {
        this.gameData = gameData;
        this.surveyRepository = surveyRepository;
        this.publisher = publisher;
    }

    async consume(socketClient: any, payload: SurveyPayload) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];

        if (realPlayer) {
            this.updateSurvey(realPlayer, payload);
        }
    }

    async updateSurvey(realPlayer: RealPlayer, payload: SurveyPayload) {
        const filter = { playerId: realPlayer.session.playerId };

        const survey = new this.surveyRepository({
            playerId: realPlayer.session.playerId,
            playerName: realPlayer.profile.name,
            wishToPlayWithRealMoney: payload.wishToPlayWithRealMoney,
        });

        await this.surveyRepository.updateOne(filter, survey.toObject(), { upsert: true }).exec();
        this.publisher.publishToUser(realPlayer.UID, { surveyUpdated: true });
    }
}
