import { RoundOfTable, TableInGame } from "../game-data";
import { retry, shuffle } from "../helpers";
import appConfigs from "../app-configs";
import { Hand } from "@rd/pusoy-rules";
import axios from "axios";
import Chance from "chance";
import { HandResult, IRound } from "../models/rounds";
import mongoose from "mongoose";
import { logger } from "sc-common";
import GameDefinition from "../game-definition";

type BotArrangeMent = HandResult & { arrangeTime: number };

export default class BotArrangementConsumer {
    chance: Chance.Chance;
    roundsRepository: mongoose.Model<IRound>;
    logService: typeof logger;
    definition: GameDefinition;

    constructor(roundsRepository: mongoose.Model<IRound>, logService: typeof logger, definition: GameDefinition) {
        this.chance = new Chance();
        this.roundsRepository = roundsRepository;
        this.logService = logService;
        this.definition = definition;
    }

    getDataFromBotApi = async (cards: number[]): Promise<Hand<number[]>> => {
        const botUrl = shuffle(appConfigs.botUrls)[0];
        const data = {
            private: {
                player_id: "",
                arrangement_id: "",
                input_hash: 0,
                input: cards,
                output: null,
            },
        };

        try {
            const response = await axios.post(botUrl, data);
            const arrangeData = response.data.output;

            return {
                front: arrangeData.segment_3,
                middle: arrangeData.segment_2,
                back: arrangeData.segment_1,
            };
        } catch (error) {
            this.logService.logError(`Error fetching data from bot API: ${botUrl}`);
            throw error;
        }
    };

    async getArrangementFromBot(result: HandResult, remainingTime: number) {
        const cards = [...result.hand.front, ...result.hand.middle, ...result.hand.back];
        const delay = 1000;
        const retries = Math.floor((remainingTime * 1000) / delay);

        try {
            const hand = await retry(() => this.getDataFromBotApi(cards), retries, delay);
            const minArrangeDuration = 5;
            const maxArrangeTime = Math.min(remainingTime, this.definition.durations.timeline.arrangement - minArrangeDuration);
            const minArrangeTime = Math.max(0, maxArrangeTime - minArrangeDuration);
            const arrangeTime = this.chance.integer({ min: minArrangeTime, max: maxArrangeTime });

            return {
                playerId: result.playerId,
                hand,
                arrangeTime,
            } as BotArrangeMent;
        } catch (error) {
            return {} as BotArrangeMent;
        }
    }

    async handleBotArrangements(tableData: TableInGame) {
        const roundData = tableData.roundData as RoundOfTable;

        const botResults = roundData.otherPlayers.map((bot) => roundData.result[bot.id]);

        const updatePromises = botResults.map(async (botResult) => {
            const botArrangement = await this.getArrangementFromBot(botResult, roundData.remainingTime);

            if (botArrangement.hand && roundData.remainingTime > 0) {
                roundData.result[botArrangement.playerId].hand = botArrangement.hand;
                roundData.result[botArrangement.playerId].time = new Date();
                roundData.otherPlayers.filter((bot) => bot.id === botArrangement.playerId)[0].arrangeTime = botArrangement.arrangeTime;

                await this.updateBotHandResultToDatabase(tableData, botArrangement.playerId);
            }
        });

        await Promise.allSettled(updatePromises);
    }

    async updateBotHandResultToDatabase(tableData: TableInGame, playerId: string) {
        const roundData = tableData.roundData as RoundOfTable;

        const filter = { id: roundData.roundId };

        const update = {
            [`result.${playerId}`]: roundData.result[playerId],
        };

        await this.roundsRepository.findOneAndUpdate(filter, update).exec();
    }
}
