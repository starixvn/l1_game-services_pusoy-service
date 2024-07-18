import GameManagementApiClientFactory, { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import { UserInfos } from "sc-game-management-client";
import GameData, { TableInGame } from "../game-data";
import { shuffle } from "../helpers";
import GameDefinition from "../game-definition";
import Chance from "chance";
import { BaseBot } from "sc-game-base/src/core/crons";
import { NUMBER_OF_BOTS } from "../constants";
import { BaseEventPublishers } from "sc-game-base/src/core";
import { IRound } from "../models/rounds";
import mongoose from "mongoose";
import { logger } from "sc-common";

export default class Bot extends BaseBot {
    declare gameData: GameData;
    declare definition: GameDefinition;
    publisher: BaseEventPublishers.BaseEventPublisher;
    chance: Chance.Chance;
    roundsRepository: mongoose.Model<IRound>;
    logService: typeof logger;

    constructor(
        gameManagementApiClientFactory: GameManagementApiClientFactory,
        gameData: GameData,
        definition: GameDefinition,
        publisher: BaseEventPublishers.BaseEventPublisher,
        roundsRepository: mongoose.Model<IRound>,
        logService: typeof logger
    ) {
        super(definition, gameData, gameManagementApiClientFactory);
        this.chance = new Chance();
        this.publisher = publisher;
        this.roundsRepository = roundsRepository;
        this.logService = logService;
    }

    async handleBotsInTable(tableInGame: TableInGame) {
        if (tableInGame.botsInTable.length < 1) {
            await this.addBotsToTableAndPublish(tableInGame);
        }

        if (tableInGame.roundData && tableInGame.roundData.remainingTime === 0) {
            await this.removeBotsFromTable(tableInGame);
        }
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

    async removeBots(botIds: string[]) {
        await post(this.gameManagementApiClient.users.updateBotsOutRoom({ botIds }));
    }

    async addBotsToTableAndPublish(tableInGame: TableInGame) {
        if (tableInGame.botsInTable.length > 0) {
            return;
        }

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

    async removeBotsFromTable(tableInGame: TableInGame) {
        const botIds = tableInGame.botsInTable.map((bot) => bot.id);
        this.removeBots(botIds);
        tableInGame.botsInTable = [];
    }
}
