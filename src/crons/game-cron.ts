import mongoose from "mongoose";
import { Table, Core } from "sc-game-base";
import GameManagementApiClientFactory, { getOrDefault } from "sc-game-base/src/core/game-management-api";
import { logger } from "sc-common";
import GameDefinition, { Duration } from "../game-definition";
import GameData, { TableInGame } from "../game-data";
import { ProvablyFairConsumer, UnsettledRoundConsumer } from "sc-game-base/src/core/event-consumers";
import SettleGameConsumer from "../consumers/settle-game-round-consumer";
import Bot from "../crons/bot";
import BotArrangementConsumer from "../consumers/bot-arrangement-consumer";
import { MAX_BOTS_ON_TABLE } from "../constants";

export default class GameCron extends Table.Crons.TableGameCron {
    roundsRepository: mongoose.Model<any>;
    declare gameData: GameData;
    declare definition: GameDefinition;
    declare settleGameRoundConsumer: SettleGameConsumer;
    declare bot: Bot;
    botArrangementConsumer: BotArrangementConsumer;

    constructor({
        definition,
        gameData,
        bot,
        settleGameRoundConsumer,
        gameStatusPublisher,
        runningRoundInfoPublisher,
        logService,
        roundResultConsumer,
        resultsRepository,
        appConfigs,
        gameManagementApiClientFactory,
        roundIdConsumer,
        roundsRepository,
        provablyFairConsumer,
        unsettledRoundConsumer,
        botArrangementConsumer,
    }: {
        definition: GameDefinition;
        gameData: GameData;
        bot: Table.Crons.TableGameBot;
        settleGameRoundConsumer: SettleGameConsumer;
        gameStatusPublisher: Core.BaseEventPublishers.GameStatusPublisher;
        runningRoundInfoPublisher: Core.BaseEventPublishers.RunningRoundInfoPublisher;
        logService: typeof logger;
        roundResultConsumer: Core.BaseEventConsumers.RoundResultConsumer;
        resultsRepository: mongoose.Model<any>;
        appConfigs: any;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
        roundIdConsumer: Core.BaseEventConsumers.RoundIdConsumer;
        roundsRepository: mongoose.Model<any>;
        provablyFairConsumer: ProvablyFairConsumer;
        unsettledRoundConsumer: UnsettledRoundConsumer;
        botArrangementConsumer: BotArrangementConsumer;
    }) {
        super({
            definition,
            gameData,
            bot,
            settleGameRoundConsumer,
            gameStatusPublisher,
            runningRoundInfoPublisher,
            logService,
            roundResultConsumer,
            resultsRepository,
            appConfigs,
            gameManagementApiClientFactory,
            roundIdConsumer,
            provablyFairConsumer,
            unsettledRoundConsumer,
        });

        this.roundsRepository = roundsRepository;
        this.botArrangementConsumer = botArrangementConsumer;
    }

    async start() {
        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.roundIdConsumer.initRoundId();
        this.startCron();
    }

    async handleGameStatus(previouslyDisabled: boolean) {
        const { configName } = this.definition;

        if (this.gameData.disabled) {
            const { durations } = this.definition;

            const notification = await getOrDefault(this.gameManagementApiClient.notification.getUmMessages(configName), {});

            this.gameData.umMessages = notification;

            this.gameData.remainingTime = durations.timeline.arrangement;

            this.gameStatusPublisher.publishDisableGameStatus();
        } else if (previouslyDisabled) {
            await this.enableGame();
        }
    }

    async proceed() {
        const durations = this.definition.durations;

        if (this.gameData.remainingTime === durations.timeline.arrangement) {
            await this.checkGameStatus();
        }

        const remainingTime = this.gameData.remainingTime;

        if (!this.gameData.disabled) {
            this.gameData.remainingTime--;
        }

        if (remainingTime === 0) {
            this.gameData.remainingTime = durations.timeline.arrangement;
            this.bot?.reset();

            console.log(
                "bots in game: ",
                this.bot.botsInGame.length,
                this.bot.botsInGame.map((bot) => bot.name)
            );

            const tableNames = Object.keys(this.gameData.ingame);

            console.log("number of tables: ", tableNames.length);
            console.log("table names: ", tableNames);

            const maxNumberOfBots = tableNames.length * MAX_BOTS_ON_TABLE;

            if (this.bot.botsInGame.length > maxNumberOfBots) {
                const botsToRemove = this.bot.botsInGame.slice(0, this.bot.botsInGame.length - maxNumberOfBots).map((bot) => bot.id);

                this.bot.removeBots(botsToRemove);

                this.bot.botsInGame = this.bot.botsInGame.slice(-maxNumberOfBots);
                this.logService.logError(`Number of bots in game is more than expected`);
            }

            if (tableNames.length === 0) {
                this.bot.resetInRoomTrackings();
            }
        }

        await Promise.all(
            Object.values(this.gameData.ingame).map(async (tableInGame) => {
                this.bot.handleBotsInTable(tableInGame);

                await this.proceedTableInGame(tableInGame, durations);
            })
        );
    }

    async proceedTableInGame(tableInGame: TableInGame, durations: Duration) {
        if (!tableInGame.roundData) {
            return;
        }

        const currentRound = tableInGame.roundData;

        if (tableInGame.canDestroy && currentRound.isSettled) {
            console.log("destroying table: ", tableInGame.name);
            await this.bot.removeAllBotsFromTable(tableInGame);
            delete this.gameData.ingame[tableInGame.name];
            return;
        }

        const numberOfPlayers = currentRound.observer ? currentRound.otherPlayers.length : currentRound.otherPlayers.length + 1;

        const remainingTime = currentRound.remainingTime;
        currentRound.remainingTime--;

        if (remainingTime === durations.timeline.deal) {
            console.log("start dealing cards: ", tableInGame.name);
            this.gameStatusPublisher.publishToUser(tableInGame.socketId, { startDeal: true, remainingTime });
        }

        if (remainingTime === durations.timeline.arrangement) {
            this.botArrangementConsumer.handleBotArrangements(tableInGame);
        }

        currentRound.otherPlayers.forEach((bot) => {
            if (bot.arrangeTime === remainingTime) {
                this.gameStatusPublisher.publishToUser(tableInGame.socketId, { submittedPlayer: bot });
                currentRound.submittedPlayers.push(bot);
            }
        });

        if (remainingTime === 0 || (remainingTime > 0 && currentRound.submittedPlayers.length === numberOfPlayers)) {
            currentRound.remainingTime = -1;

            currentRound.showingResultTime = await this.settleGameRoundConsumer.settleTable(tableInGame);

            currentRound.isSettled = true;

            this.gameStatusPublisher.publishToUser(tableInGame.socketId, {
                remainingTime: currentRound.showingResultTime + durations.timeline.transition,
            });
        }

        if (remainingTime === -currentRound.showingResultTime) {
            console.log("showing result: ", tableInGame.name);
            await this.bot.removeSomeBotsFromTable(tableInGame);
            delete tableInGame.roundData;
        }
    }
}
