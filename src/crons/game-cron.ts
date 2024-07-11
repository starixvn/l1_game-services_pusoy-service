import mongoose from "mongoose";
import { Table, Core } from "sc-game-base";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { logger } from "sc-common";
import GameDefinition, { Duration } from "../game-definition";
import GameData from "../game-data";
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
        await this.roundIdConsumer.initRoundId();
        this.startCron();
    }

    async proceed() {
        const durations = this.definition.durations as Duration;

        if (this.gameData.remainingTime === durations.wholeRound) {
            await this.checkGameStatus();
            !this.gameData.disabled;
        }

        await Promise.all(
            Object.values(this.gameData.ingame).map(async (tableInGame) => {
                const roundId = tableInGame.roundId;
                const currentRound = tableInGame.betTracks[roundId];
                const numberOfPlayers = currentRound.otherPlayers.length + 1;
                const remainingTime = tableInGame.remainingTime;
                let showingResultTime = 0;

                tableInGame.remainingTime--;

                currentRound.otherPlayers.map((bot) => {
                    if (bot.arrangeTime === remainingTime) {
                        this.gameStatusPublisher.publishToUser(tableInGame.userId, { submittedPlayer: bot });
                        ++currentRound.numberOfSubmittedHands;
                    }
                });

                if (remainingTime === durations.lockArrange || currentRound.numberOfSubmittedHands === numberOfPlayers) {
                    tableInGame.remainingTime = durations.lockArrange - 1;
                    showingResultTime -= await this.settleGameRoundConsumer.settleTable(tableInGame.name);
                    this.gameStatusPublisher.publishToUser(tableInGame.userId, { showingResultTime });
                    tableInGame.isRoundEnded = true;
                    tableInGame.canBotLeave = true;
                }

                if (remainingTime === showingResultTime) {
                    tableInGame.remainingTime = durations.wholeRound;
                }
            })
        );
    }

    async addBotsToTableAndPublish(tableName: string, roundId: number) {
        const tableData = this.gameData.ingame[tableName];
        const currentRound = tableData.betTracks[roundId];

        const bots = await this.bot.getBotsToJoin();

        bots.forEach((bot) => {
            currentRound.otherPlayers.push({
                id: bot.id,
                name: bot.name,
                red: bot.red,
                avatarId: bot.avatarId,
            });
        });

        this.gameStatusPublisher.publishToUser(tableData.userId, { players: currentRound.otherPlayers });
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
