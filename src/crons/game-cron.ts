import mongoose from "mongoose";
import { Table, Core } from "sc-game-base";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { logger } from "sc-common";
import GameDefinition, { Duration } from "../game-definition";
import GameData, { TableInGame } from "../game-data";
import { ProvablyFairConsumer, UnsettledRoundConsumer } from "sc-game-base/src/core/event-consumers";
import SettleGameConsumer from "../consumers/settle-game-round-consumer";
import Bot from "../crons/bot";

export default class GameCron extends Table.Crons.TableGameCron {
    roundsRepository: mongoose.Model<any>;
    declare gameData: GameData;
    declare definition: GameDefinition;
    declare settleGameRoundConsumer: SettleGameConsumer;
    declare bot: Bot;

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
    }

    async start() {
        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.roundIdConsumer.initRoundId();
        this.startCron();
    }

    async proceed() {
        const durations = this.definition.durations as Duration;
        const remainingTime = this.gameData.remainingTime;

        if (remainingTime === durations.wholeRound) {
            await this.checkGameStatus();
        }

        this.gameData.remainingTime--;

        if (remainingTime === 0) {
            this.gameData.remainingTime = durations.wholeRound;
        }

        await Promise.all(
            Object.values(this.gameData.ingame).map(async (tableInGame) => {
                if (tableInGame.botsInTable.length === 0) {
                    this.addBotsToTableAndPublish(tableInGame);
                }

                await this.proceedTableInGame(tableInGame, durations);
            })
        );
    }

    async proceedTableInGame(tableInGame: TableInGame, durations: Duration) {
        const roundId = tableInGame.roundId;
        const currentRound = tableInGame.betTracks[roundId];

        if (roundId <= 0 || !currentRound) {
            return;
        }

        const numberOfPlayers = currentRound.otherPlayers.length + 1;
        const remainingTime = tableInGame.remainingTime;
        let showingResultTime = 0;

        tableInGame.remainingTime--;

        currentRound.otherPlayers.forEach((bot) => {
            if (bot.arrangeTime === remainingTime) {
                this.gameStatusPublisher.publishToUser(tableInGame.userId, { submittedPlayer: bot });
                currentRound.numberOfSubmittedHands++;
            }
        });

        if (remainingTime === durations.lockArrange || currentRound.numberOfSubmittedHands === numberOfPlayers) {
            tableInGame.remainingTime = durations.lockArrange - 1;
            showingResultTime -= await this.settleGameRoundConsumer.settleTable(tableInGame.name);
            this.gameStatusPublisher.publishToUser(tableInGame.userId, { showingResultTime });
            this.removeBotsFromTable(tableInGame);
            tableInGame.isRoundEnded = true;
            tableInGame.canBotLeave = true;
        }

        if (remainingTime === showingResultTime) {
            tableInGame.remainingTime = durations.wholeRound;
        }
    }

    async addBotsToTableAndPublish(tableInGame: TableInGame) {
        const bots = await this.bot.getBotsToJoin();

        bots.forEach((bot) => {
            tableInGame.botsInTable.push({
                id: bot.id,
                name: bot.name,
                red: bot.red,
                avatarId: bot.avatarId,
            });
        });

        this.gameStatusPublisher.publishToUser(tableInGame.userId, { otherPlayers: tableInGame.botsInTable });
    }

    removeBotsFromTable(tableInGame: TableInGame) {
        tableInGame.botsInTable = [];
    }

    async updateBotArrangements(tableName: string, roundId: number) {
        const tableData = this.gameData.ingame[tableName];
        const currentRound = tableData.betTracks[roundId];

        const botArrangements = await this.bot.getArrangementFromBots(tableName, roundId);

        botArrangements.forEach((botHand) => {
            currentRound.result[botHand.playerId] = {
                hand: botHand.hand,
                playerId: botHand.playerId,
            };

            currentRound.otherPlayers.filter((bot) => bot.id === botHand.playerId)[0].arrangeTime = botHand.arrangeTime;
        });

        // await this.updateHandResultToDatabase(tableName);
    }
}
