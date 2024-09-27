import { stub } from "jest-auto-stub";
import GameCron from "../../../src/crons/game-cron";
import GameManagementApiClientFactory, { getOrDefault } from "sc-game-base/src/core/game-management-api";
import GameData from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import { ProvablyFairConsumer, UnsettledRoundConsumer } from "sc-game-base/src/core/event-consumers";
import { Core } from "sc-game-base";
import BotArrangementConsumer from "../../../src/consumers/bot-arrangement-consumer";
import SettleGameConsumer from "../../../src/consumers/settle-game-round-consumer";
import Bot from "../../../src/crons/bot";

jest.mock("sc-game-base/src/core/game-management-api", () => ({
    getOrDefault: jest.fn(),
}));

describe("GameCron", () => {
    let gameCron: GameCron;
    const gameData = stub<GameData>();
    const definition = stub<GameDefinition>();
    const bot = stub<Bot>();
    const settleGameConsumer = stub<SettleGameConsumer>();
    const gameStatusPublisher = stub<Core.BaseEventPublishers.GameStatusPublisher>();
    const runningRoundPublisher = stub<Core.BaseEventPublishers.RunningRoundInfoPublisher>();
    const roundResultConsumer = stub<Core.BaseEventConsumers.RoundResultConsumer>();
    const gameManagementApiClientFactory = stub<GameManagementApiClientFactory>();
    const roundIdConsumer = stub<Core.BaseEventConsumers.RoundIdConsumer>();
    const provablyFairConsumer = stub<ProvablyFairConsumer>();
    const unsettledRoundConsumer = stub<UnsettledRoundConsumer>();
    const botArrangementConsumer = stub<BotArrangementConsumer>();

    definition.durations = {
        timeline: {
            animation: 10,
            deal: 5,
            arrangement: 3,
            transition: 2,
        },
    } as any;

    beforeEach(() => {
        gameCron = new GameCron({
            definition,
            gameData,
            bot: bot as any,
            settleGameRoundConsumer: settleGameConsumer,
            gameStatusPublisher,
            runningRoundInfoPublisher: runningRoundPublisher,
            logService: null as any,
            roundResultConsumer,
            resultsRepository: {} as any,
            appConfigs: {},
            gameManagementApiClientFactory,
            roundIdConsumer,
            roundsRepository: { findOne: jest.fn() } as any,
            provablyFairConsumer,
            unsettledRoundConsumer,
            botArrangementConsumer,
        });

        gameCron.gameManagementApiClient = {
            notification: {
                getUmMessages: jest.fn(),
            },
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("start", () => {
        it("should initialize settings and start cron jobs", async () => {
            // Arrange
            jest.spyOn(gameCron, "getSettingForNewRound").mockImplementation(async () => {});
            jest.spyOn(gameCron, "updateExchangeRates").mockImplementation(async () => {});
            jest.spyOn(gameCron, "startCron").mockImplementation(() => {});

            // Act
            await gameCron.start();

            // Assert
            expect(gameCron.getSettingForNewRound).toHaveBeenCalled();
            expect(gameCron.updateExchangeRates).toHaveBeenCalled();
            expect(roundIdConsumer.initRoundId).toHaveBeenCalled();
            expect(gameCron.startCron).toHaveBeenCalled();
        });
    });

    describe("handleGameStatus", () => {
        it("should handle game disabled status", async () => {
            // Arrange
            gameData.disabled = true;
            (getOrDefault as jest.Mock).mockResolvedValue({ message: "Game Disabled" });

            // Act
            await gameCron.handleGameStatus(false);

            // Assert
            expect(getOrDefault).toHaveBeenCalled();
            expect(gameData.umMessages).toEqual({ message: "Game Disabled" });
            expect(gameData.remainingTime).toBe(definition.durations.timeline.arrangement);
        });

        it("should enable the game if previously disabled", async () => {
            // Arrange
            gameData.disabled = false;
            jest.spyOn(gameCron, "enableGame").mockImplementation(async () => {});

            // Act
            await gameCron.handleGameStatus(true);

            // Assert
            expect(gameCron.enableGame).toHaveBeenCalled();
        });
    });

    describe("proceed", () => {
        it("should decrease remaining time and handle game status", async () => {
            // Arrange
            gameData.remainingTime = definition.durations.timeline.arrangement;
            gameData.disabled = false;
            jest.spyOn(gameCron, "checkGameStatus").mockImplementation(async () => {});
            jest.spyOn(gameCron, "proceedTableInGame").mockImplementation(async () => {});

            // Act
            await gameCron.proceed();

            // Assert
            expect(gameData.remainingTime).toBe(definition.durations.timeline.arrangement - 1);
            expect(gameCron.checkGameStatus).toHaveBeenCalled();
        });

        it("should reset remaining time and reset bots when remaining time is 0", async () => {
            // Arrange
            gameData.remainingTime = 0;
            bot.reset = jest.fn();
            bot.botsInGame = [];

            // Act
            await gameCron.proceed();

            // Assert
            expect(gameData.remainingTime).toBe(definition.durations.timeline.arrangement);
            expect(bot.reset).toHaveBeenCalled();
        });
    });

    describe("proceedTableInGame", () => {
        it("should handle table destruction if it can be destroyed", async () => {
            // Arrange
            const tableInGame: any = {
                name: "testTable",
                canDestroy: true,
                roundData: {
                    isSettled: true,
                },
            };
            gameData.ingame[tableInGame.name] = tableInGame;

            // Act
            await gameCron.proceedTableInGame(tableInGame, definition.durations);

            // Assert
            expect(bot.removeAllBotsFromTable).toHaveBeenCalledWith(tableInGame);
            expect(gameData.ingame[tableInGame.name]).toBeUndefined();
        });

        it("should handle bot arrangements when remaining time equals arrangement time", async () => {
            // Arrange
            const tableInGame: any = {
                name: "testTable",
                roundData: {
                    remainingTime: definition.durations.timeline.arrangement,
                    otherPlayers: [],
                    submittedPlayers: [],
                },
                socketId: "socket123",
            };

            // Act
            await gameCron.proceedTableInGame(tableInGame, definition.durations);

            // Assert
            expect(botArrangementConsumer.handleBotArrangements).toHaveBeenCalledWith(tableInGame);
        });

        it("should handle round settlement when remaining time is 0", async () => {
            // Arrange
            const tableInGame: any = {
                name: "testTable",
                roundData: {
                    remainingTime: 0,
                    otherPlayers: [],
                    submittedPlayers: [],
                },
                socketId: "socket123",
            };

            settleGameConsumer.settleTable = jest.fn().mockResolvedValue(2);

            // Act
            await gameCron.proceedTableInGame(tableInGame, definition.durations);

            // Assert
            expect(settleGameConsumer.settleTable).toHaveBeenCalledWith(tableInGame);
            expect(gameStatusPublisher.publishToUser).toHaveBeenCalledWith(tableInGame.socketId, {
                remainingTime: 4,
            });
        });
    });
});
