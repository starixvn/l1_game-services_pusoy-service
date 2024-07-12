import GameManagementApiClientFactory, { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import { UserInfos } from "sc-game-management-client";
import GameData from "../game-data";
import { shuffle } from "../helpers";
import appConfigs from "../app-configs";
import { Hand } from "@rd/pusoy-rules";
import axios from "axios";
import GameDefinition, { Duration } from "../game-definition";
import Chance from "chance";
import { BaseBot } from "sc-game-base/src/core/crons";
import { NUMBER_OF_BOTS } from "../constants";

export default class Bot extends BaseBot {
    declare gameData: GameData;
    declare definition: GameDefinition;
    chance: Chance.Chance;

    constructor(gameManagementApiClientFactory: GameManagementApiClientFactory, gameData: GameData, definition: GameDefinition) {
        super(definition, gameData, gameManagementApiClientFactory);
        this.chance = new Chance();
    }

    async getBotsToJoin(): Promise<UserInfos[]> {
        const bots = await getOrDefault(this.gameManagementApiClient.users.getAllBots(NUMBER_OF_BOTS, true), []);

        if (bots.length > 0) {
            await post(
                this.gameManagementApiClient.users.updateBotsJoinRoom({
                    botIds: bots.map((bot: any) => bot.id),
                    gameName: this.definition.configName,
                })
            );
        }

        return shuffle(bots);
    }

    async getArrangementFromBots(
        playerName: string,
        roundId: number
    ): Promise<{ playerId: string; hand: Hand<number[]>; arrangeTime: number }[]> {
        const duration = this.definition.durations as Duration;
        const tableData = this.gameData.ingame[playerName];
        const currentRound = tableData.betTracks[roundId];
        const maxTime = Math.max(tableData.remainingTime, duration.lockArrange);
        const botResults = currentRound.otherPlayers.map((bot) => currentRound.result[bot.id]);

        const result = await Promise.all(
            botResults.map(async (result) => {
                const cards = [...result.hand.front, ...result.hand.middle, ...result.hand.back];
                const hand = await this.getArrangementFromBot(cards);
                const arrangeTime = this.chance.integer({ min: duration.lockArrange, max: maxTime });
                if (!hand) {
                    return {
                        playerId: result.playerId,
                        hand: result.hand,
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

    async removeBots(botIds: string[]) {
        await post(this.gameManagementApiClient.users.updateBotsOutRoom({ botIds }));
    }
}
