import GameManagementApiClientFactory, { getOrDefault } from "sc-game-base/src/core/game-management-api";
import { UserInfos, gameManagementClient } from "sc-game-management-client";
import Chance from "chance";
import GameData from "../game-data";
import { getDefaultHandFromCards, shuffle } from "../helpers";
import appConfigs from "../app-configs";
import { Hand } from "@rd/pusoy-rules";
import axios from "axios";
import { GameSettings } from "../game-definition";

export default class ManageBotConsumer {
    gameManagementApiClient: gameManagementClient;
    chance: Chance.Chance;
    maxNumberOfBots: number;
    gameData: GameData;
    gameSettings: GameSettings;

    constructor({
        gameManagementApiClient,
        maxNumberOfBots,
        gameData,
        gameSettings,
    }: {
        gameManagementApiClient: GameManagementApiClientFactory;
        maxNumberOfBots: number;
        gameData: GameData;
        gameSettings: GameSettings;
    }) {
        this.gameManagementApiClient = gameManagementApiClient.instance();
        this.chance = new Chance();
        this.maxNumberOfBots = maxNumberOfBots;
        this.gameData = gameData;
        this.gameSettings = gameSettings;
    }

    async getBots(): Promise<UserInfos[]> {
        const bots = await getOrDefault(this.gameManagementApiClient.users.getAllBots(this.maxNumberOfBots, true), []);
        return this.chance.shuffle(bots);
    }

    async getArrangementFromBots(playerName: string): Promise<{ playerId: string; hand: Hand<number[]>; arrangeTime: number }[]> {
        const botResults = this.gameData.ingame[playerName].result.slice(1, this.gameData.ingame[playerName].result.length);
        const maxTime = this.gameSettings.durations.wholeRound - this.gameSettings.durations.lockArrange;

        const result = await Promise.all(
            botResults.map(async (result) => {
                const cards = [...result.hand.front, ...result.hand.middle, ...result.hand.back];
                const hand = await this.getArrangementFromBot(cards);
                const arrangeTime = this.chance.integer({ min: 0, max: maxTime });
                if (!hand) {
                    return {
                        playerId: result.playerId,
                        hand: getDefaultHandFromCards(cards),
                        arrangeTime,
                    };
                }

                return {
                    playerId: result.playerId,
                    hand,
                    arrangeTime,
                };
            })
        );

        return result;
    }

    getArrangementFromBot = async (cards: number[]): Promise<Hand<number[]>> => {
        const botUrl = shuffle(appConfigs.botUrls)[0];
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
