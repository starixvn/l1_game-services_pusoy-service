import mongoose from "mongoose";
import { Table, Core } from "sc-game-base";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { logger } from "sc-common";
import GameDefinition, { Duration } from "../game-definition";
import GameData, { TableInGame } from "../game-data";
import { ProvablyFairConsumer, UnsettledRoundConsumer } from "sc-game-base/src/core/event-consumers";
import SettleGameConsumer from "../consumers/settle-game-round-consumer";
import Bot from "../crons/bot";
import BotArrangementConsumer from "../consumers/bot-arrangement-consumer";

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

    async proceed() {
        const durations = this.definition.durations as Duration;

        if (this.gameData.remainingTime === durations.wholeRound) {
            await this.checkGameStatus();
        }

        const remainingTime = this.gameData.remainingTime;

        if (!this.gameData.disabled) {
            this.gameData.remainingTime--;
        }

        if (remainingTime === 0) {
            this.gameData.remainingTime = durations.wholeRound;
        }

        await Promise.all(
            Object.values(this.gameData.ingame).map(async (tableInGame) => {
                if (tableInGame.botsInTable.length === 0) {
                    this.bot.addBotsToTableAndPublish(tableInGame);
                }

                await this.proceedTableInGame(tableInGame, durations);
            })
        );
    }

    async proceedTableInGame(tableInGame: TableInGame, durations: Duration) {
        if (!tableInGame.roundData) {
            return;
        }

        const { roundData: currentRound } = tableInGame;
        const numberOfPlayers = currentRound.otherPlayers.length + 1;
        const remainingTime = currentRound.remainingTime;
        let showingResultTime = 0;

        if (remainingTime === durations.wholeRound) {
            this.gameStatusPublisher.publishToUser(tableInGame.socketId, { startRound: true, remainingTime });
            this.botArrangementConsumer.handleBotArrangements(tableInGame);
        }

        currentRound.remainingTime--;

        currentRound.otherPlayers.forEach((bot) => {
            if (bot.arrangeTime === remainingTime) {
                this.gameStatusPublisher.publishToUser(tableInGame.socketId, { submittedPlayer: bot });
                currentRound.submittedPlayers.push(bot);
            }
        });

        if (remainingTime === 0 || currentRound.submittedPlayers.length === numberOfPlayers) {
            currentRound.remainingTime = -1;
            showingResultTime = await this.settleGameRoundConsumer.settleTable(tableInGame.name);

            this.gameStatusPublisher.publishToUser(tableInGame.socketId, {
                remainingTime: showingResultTime + durations.startingRound + durations.wholeRound,
            });

            delete tableInGame.roundData;

            if (tableInGame.canDestroy) {
                delete this.gameData.ingame[tableInGame.name];
            }
        }

        if (remainingTime === -showingResultTime) {
            currentRound.remainingTime = durations.wholeRound + durations.startingRound;
        }
    }
}
