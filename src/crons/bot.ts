import GameManagementApiClientFactory, { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import { UserInfos } from "sc-game-management-client";
import GameData, { TableInGame } from "../game-data";
import { shuffle } from "../helpers";
import appConfigs from "../app-configs";
import { Hand } from "@rd/pusoy-rules";
import axios from "axios";
import GameDefinition, { Duration } from "../game-definition";
import Chance from "chance";
import { BaseBot } from "sc-game-base/src/core/crons";
import { NUMBER_OF_BOTS } from "../constants";
import { BaseEventPublishers } from "sc-game-base/src/core";

export default class Bot extends BaseBot {
    declare gameData: GameData;
    declare definition: GameDefinition;
    publisher: BaseEventPublishers.BaseEventPublisher;
    chance: Chance.Chance;

    constructor(
        gameManagementApiClientFactory: GameManagementApiClientFactory,
        gameData: GameData,
        definition: GameDefinition,
        publisher: BaseEventPublishers.BaseEventPublisher
    ) {
        super(definition, gameData, gameManagementApiClientFactory);
        this.chance = new Chance();
        this.publisher = publisher;
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
        const tableData = this.gameData.ingame[playerName];
        const maxTime = Math.max(tableData.roundData!.remainingTime, 0);
        const botResults = tableData.roundData!.otherPlayers.map((bot) => tableData.roundData!.result[bot.id]);

        const result = await Promise.all(
            botResults.map(async (result) => {
                const cards = [...result.hand.front, ...result.hand.middle, ...result.hand.back];
                const hand = await this.getArrangementFromBot(cards);
                const arrangeTime = this.chance.integer({ min: 0, max: maxTime });
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

    async addBotsToTableAndPublish(tableInGame: TableInGame) {
        const bots = await this.getBotsToJoin();

        bots.forEach((bot) => {
            tableInGame.botsInTable.push({
                id: bot.id,
                name: bot.name,
                red: bot.red,
                avatarId: bot.avatarId,
            });
        });

        this.publisher.publishToUser(tableInGame.socketId, { otherPlayers: tableInGame.botsInTable });
    }

    removeBotsFromTable(tableInGame: TableInGame) {
        tableInGame.botsInTable = [];
    }

    async updateBotArrangements(tableName: string, roundId: number) {
        const tableData = this.gameData.ingame[tableName];

        const botArrangements = await this.getArrangementFromBots(tableName, roundId);

        botArrangements.forEach((botHand) => {
            tableData.roundData!.result[botHand.playerId] = {
                hand: botHand.hand,
                playerId: botHand.playerId,
            };

            tableData.roundData!.otherPlayers.filter((bot) => bot.id === botHand.playerId)[0].arrangeTime = botHand.arrangeTime;
        });

        // await this.updateHandResultToDatabase(tableName);
    }
}
