import { Model } from "mongoose";
import appConfigs from "../app-configs";
import { IRound } from "../models/rounds";
import GameData from "../game-data";
import { GameSettings } from "../game-definition";
import axios from "axios";
import { Hand } from "@rd/pusoy-rules";

export default class GetArrangementFromAIBotConsumer {
    roundsRepository: Model<IRound>;
    gameData: GameData;
    gameSettings: GameSettings;

    constructor(roundsRepository: Model<IRound>, gameData: GameData, gameSettings: GameSettings) {
        this.roundsRepository = roundsRepository;
        this.gameData = gameData;
        this.gameSettings = gameSettings;
    }

    async getArrangementFromBots(playerName: string) {
        const { roundId } = this.gameData.ingame[playerName];
        const round = await this.roundsRepository.findOne({ id: roundId }).lean().exec();

        if (!round) {
            return;
        }

        for (let i = 1; i < round.result.length; i++) {
            const botUrl = appConfigs.botUrlMapping[round.result[i].playerId];
            const cards = [...round.result[i].hand.front, ...round.result[i].hand.middle, ...round.result[i].hand.back];
            const hand = await this.getArrangementFromBot(botUrl, cards);
            if (!hand) {
                continue;
            }
            round.result[i].time = new Date();
            round.result[i].hand = hand;
            this.gameData.ingame[playerName].result[i] = {
                hand,
                playerId: round.result[i].playerId,
            };
            const maxTime = this.gameSettings.durations.wholeRound - this.gameSettings.durations.lockArrange;
            this.gameData.ingame[playerName].arrangeTime[i] =
                crypto.getRandomValues(new Uint32Array(1))[0] * (maxTime - this.gameData.ingame[playerName].remainingTime);
        }
    }

    getArrangementFromBot = async (botUrl: string, cards: number[]): Promise<Hand<number[]> | undefined> => {
        const data = {
            private: {
                player_id: "",
                arrangement_id: "",
                input_hand: 0,
                input: cards,
            },
        };
        const rawData = await axios.post(botUrl, data).then((res) => {
            return res.data;
        });

        return rawData?.private.output.map((item: any) => ({
            front: item.segment_3,
            middle: item.segment_2,
            back: item.segment_1,
        }));
    };
}
