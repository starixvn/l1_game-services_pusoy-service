import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData, { BotInRound, RealPlayer, RoundOfTable, TableInGame } from "../game-data";
import GameDefinition from "../game-definition";
import scoreConfig from "../score-config";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { Core, Table } from "sc-game-base";
import { RoundQuery } from "sc-game-base/src/core/query-apis";
import { ISurvey } from "../models/survey";
import mongoose from "mongoose";
import Chance from "chance";
import * as Helper from "../helpers";

import { BOT_SLOTS, DEFAULT_BALANCE } from "../constants";
import BotArrangementConsumer from "./bot-arrangement-consumer";
import Bot from "../crons/bot";
export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    declare definition: GameDefinition;
    surveyRepository: mongoose.Model<ISurvey>;
    botArrangementConsumer: BotArrangementConsumer;
    bot: Bot;

    constructor(
        definition: GameDefinition,
        gameData: GameData,
        roundQuery: RoundQuery,
        publisher: Core.BaseEventPublishers.BaseEventPublisher,
        getBalance: any,
        gameManagementApiClientFactory: GameManagementApiClientFactory,
        surveyRepository: mongoose.Model<ISurvey>,
        botArrangementConsumer: BotArrangementConsumer,
        bot: Bot
    ) {
        super(definition, gameData, roundQuery, publisher, getBalance, gameManagementApiClientFactory);
        this.surveyRepository = surveyRepository;
        this.botArrangementConsumer = botArrangementConsumer;
        this.bot = bot;
    }

    async consume(realPlayer: RealPlayer) {
        const { gameConfigs } = this.gameData;
        const disabled = !gameConfigs || !gameConfigs.enabled;

        if (disabled) {
            realPlayer.socketClient.emit(this.definition.name, { um: disabled, um_message: this.gameData.umMessages });
        } else {
            await this.initOrUpdateTable(realPlayer);
        }

        const payload = await this.buildPayload(realPlayer);

        this.publisher.publishToUser(realPlayer.UID, payload);
    }

    async buildPayload(realPlayer: RealPlayer) {
        const user = await this.getUserInfo(realPlayer);
        const { exchangeRates } = this.gameData;
        const { session } = realPlayer;
        const rate = exchangeRates.code[session.currencyCode] * session.multiplier;
        const configs = this.getGameConfigs(session.currencyGroupId);
        const roundData = this.getCurrentRoundData(realPlayer);
        const playerName = realPlayer.profile.name;
        const tableData = this.gameData.ingame[playerName];
        const surveyStatus = await this.getSurveyStatus(realPlayer.session.playerId);

        return {
            remainingTime: tableData.roundData ? roundData.remainingTime : this.definition.durations.timeline.transition,
            otherPlayers: tableData.botsInTable || [],
            gameConfigs: configs,
            pusoyRound: tableData.roundData ? roundData : { playerBalance: tableData.balance },
            user: { ...user, rate },
            surveyUpdated: surveyStatus,
            observer: tableData.roundData?.observer ?? false,
        };
    }

    getGameConfigs(currencyGroupId: string) {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === currencyGroupId);
        const gameSettings = { durations: this.definition.durations, suitesMapper: this.definition.suitesMapper, scoreConfig: scoreConfig };

        return { ...settings, ...gameSettings };
    }

    async getSurveyStatus(playerId: string) {
        const survey = await this.surveyRepository.findOne({ playerId });

        return survey ? survey.wishToPlayWithRealMoney : false;
    }

    getCurrentRoundData(realPlayer: RealPlayer) {
        const playerName = realPlayer.profile.name;
        const tableData = this.gameData.ingame[playerName];
        const currentRound = tableData.roundData;
        const invalidRemainingTime = -1;
        let remainingTime = currentRound?.remainingTime;

        if (currentRound && currentRound.remainingTime < 0) {
            remainingTime = this.definition.durations.timeline.transition - currentRound.remainingTime;
        }

        return {
            otherPlayers: currentRound?.otherPlayers,
            submittedPlayers: currentRound?.submittedPlayers,
            remainingTime: currentRound ? remainingTime : invalidRemainingTime,
            roundId: currentRound?.roundId,
            playerBalance: tableData.balance,
            observer: currentRound?.observer ?? false,
        };
    }

    async initOrUpdateTable(realPlayer: RealPlayer) {
        const chance = new Chance();
        const tableData = this.gameData.ingame[realPlayer.profile.name];

        if (tableData?.roundData && tableData.roundData.remainingTime > 0) {
            tableData.socketId = realPlayer.UID;
            tableData.playerId = realPlayer.session.playerId;
            tableData.canDestroy = false;
            tableData.canAddBot = true;
        } else {
            const newTable = this.createNewTable(realPlayer);
            chance.bool() === true && (await this.fakeUnfinishedRound(newTable));
            this.gameData.ingame[realPlayer.profile.name] = newTable;
        }
    }

    createNewTable(realPlayer: RealPlayer) {
        const chance = new Chance();

        const newTable = {
            canDestroy: false,
            canAddBot: true,
            socketId: realPlayer.UID,
            playerId: realPlayer.session.playerId,
            name: realPlayer.profile.name,
            currency: realPlayer.session.currencyName,
            system: realPlayer.session.system,
            betQueue: [],
            operatorId: realPlayer.session.operatorId,
            botsInTable: [] as BotInRound[],
            freeBotSlots: BOT_SLOTS,
            balance: DEFAULT_BALANCE,
            searchingPlayersTime: chance.integer({
                min: this.definition.searchingPlayersTime.min,
                max: this.definition.searchingPlayersTime.max,
            }),
        } as TableInGame;

        return newTable;
    }

    async fakeUnfinishedRound(tableInGame: TableInGame) {
        await this.fakeBotInTable(tableInGame);

        if (tableInGame.botsInTable.length < 2) {
            return;
        }

        tableInGame.searchingPlayersTime = 0;

        const chance = new Chance();

        const maxFakeRemainingTime = this.definition.durations.timeline.arrangement - 2;
        const minFakeRemainingTime = 4;

        const newRound: RoundOfTable = {
            roundId: this.gameData.roundId,
            remainingTime: chance.integer({ min: minFakeRemainingTime, max: maxFakeRemainingTime }),
            showingResultTime: 0,
            result: {},
            otherPlayers: [...tableInGame.botsInTable],
            submittedPlayers: [],
            realPlayerSubmitted: false,
            isSettled: false,
            observer: true,
        };

        this.gameData.roundId++;

        const hands = Helper.dealHands(tableInGame.botsInTable.length);

        newRound.otherPlayers.forEach((bot, index) => {
            const botHand = {
                hand: hands[index],
                playerId: bot.id,
                slot: bot.slot,
                time: new Date(),
            };

            newRound.result[bot.id] = botHand;
        });

        tableInGame.roundData = newRound;

        this.botArrangementConsumer.handleBotArrangements(tableInGame);
    }

    async fakeBotInTable(tableInGame: TableInGame) {
        const chance = new Chance();
        const numberOfBots = chance.pickone([2, 3]);
        const bots = await this.bot.getBotsToJoin(numberOfBots);

        bots.forEach((bot) => {
            const slot = chance.pickone(tableInGame.freeBotSlots);
            tableInGame.freeBotSlots = tableInGame.freeBotSlots.filter((s) => s !== slot);

            const newBot = {
                id: bot.id,
                name: bot.name,
                red: bot.red,
                avatarId: bot.avatarId,
                slot: slot,
                balance: chance.integer({ min: DEFAULT_BALANCE - 100, max: DEFAULT_BALANCE + 100 }),
            };

            tableInGame.botsInTable.push(newBot);
            this.bot.botsInGame.push(newBot);
        });
    }
}
