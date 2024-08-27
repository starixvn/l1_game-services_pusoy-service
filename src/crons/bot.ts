import GameManagementApiClientFactory, { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import { UserInfos } from "sc-game-management-client";
import GameData, { BotInRound, TableInGame } from "../game-data";
import { shuffle } from "../helpers";
import GameDefinition from "../game-definition";
import Chance from "chance";
import { BaseBot } from "sc-game-base/src/core/crons";
import { BOT_SLOTS, MAX_BOTS_ON_TABLE } from "../constants";
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
    botsInGame: BotInRound[] = [];

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
        if (tableInGame.botsInTable.length < MAX_BOTS_ON_TABLE) {
            this.addBotsToTableAndPublish(tableInGame);
        }
    }

    async getBotsToJoin(numberOfBots: number): Promise<UserInfos[]> {
        const bots = await getOrDefault(this.gameManagementApiClient.users.getAllBots(numberOfBots, true), []);

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
        this.botsInGame = this.botsInGame.filter((bot) => !botIds.includes(bot.id));
        await post(this.gameManagementApiClient.users.updateBotsOutRoom({ botIds }));
    }

    async updateBotList() {}

    async addBotsToTableAndPublish(tableInGame: TableInGame) {
        const numberOfBots = Math.min(
            this.chance.weighted(this.definition.botSettings.joinConfigs.numberOfBots, this.definition.botSettings.joinConfigs.rate),
            tableInGame.freeBotSlots.length,
            this.maxNumberOfBots - this.botsInGame.length
        );

        if (numberOfBots < 1) {
            return;
        }

        const bots = await this.getBotsToJoin(numberOfBots);

        if (bots.length === 0) {
            return;
        }

        bots.forEach((bot) => {
            const slot = this.chance.pickone(tableInGame.freeBotSlots);
            tableInGame.freeBotSlots = tableInGame.freeBotSlots.filter((s) => s !== slot);

            const newBot = {
                id: bot.id,
                name: bot.name,
                red: bot.red,
                avatarId: bot.avatarId,
                slot: slot,
            };

            tableInGame.botsInTable.push(newBot);
            this.botsInGame.push(newBot);
        });

        console.log(
            "add bots: ",
            this.botsInGame.length,
            this.botsInGame.map((bot) => bot.name)
        );

        this.publisher.publishToUser(tableInGame.socketId, {
            otherPlayers: tableInGame.botsInTable,
        });
    }

    async removeAllBotsFromTable(tableInGame: TableInGame) {
        const botIds = tableInGame.botsInTable.map((bot) => bot.id);
        await this.removeBots(botIds);
        tableInGame.botsInTable = [];
        tableInGame.freeBotSlots = BOT_SLOTS;
    }

    async removeSomeBotsFromTable(tableInGame: TableInGame) {
        const botIds = tableInGame.botsInTable.map((bot) => bot.id);

        const numberOfBotsToRemove = Math.min(
            this.chance.weighted(this.definition.botSettings.leaveConfigs.numberOfBots, this.definition.botSettings.leaveConfigs.rate),
            botIds.length
        );

        if (numberOfBotsToRemove === 0) {
            return;
        }

        const botsToRemove = this.chance.pickset(botIds, numberOfBotsToRemove);

        await this.removeBots(botsToRemove);

        tableInGame.botsInTable = tableInGame.botsInTable.filter((bot) => !botsToRemove.includes(bot.id));
        const currentBotSlots = tableInGame.botsInTable.map((bot) => bot.slot);
        tableInGame.freeBotSlots = BOT_SLOTS.filter((slot) => !currentBotSlots.includes(slot));

        this.publisher.publishToUser(tableInGame.socketId, {
            otherPlayers: tableInGame.botsInTable,
        });
    }
}
