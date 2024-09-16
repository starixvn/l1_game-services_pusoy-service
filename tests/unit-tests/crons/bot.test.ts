import Bot from "../../../src/crons/bot";
import GameManagementApiClientFactory, { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import GameData, { TableInGame } from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import { BaseEventPublishers } from "sc-game-base/src/core";
import { IRound } from "../../../src/models/rounds";
import mongoose from "mongoose";
import Chance from "chance";
import { BOT_SLOTS, DEFAULT_BALANCE, MAX_BOTS_ON_TABLE } from "../../../src/constants";
import { shuffle } from "../../../src/helpers";
import { logger } from "sc-common";
import { stub } from "jest-auto-stub";

jest.mock("sc-game-base/src/core/game-management-api", () => ({
    getOrDefault: jest.fn(),
    post: jest.fn(),
}));

jest.mock("../../../src/helpers", () => ({
    shuffle: jest.fn(),
}));

describe("Bot", () => {
    let botInstance: Bot;
    let gameData: GameData;
    let gameDefinition: GameDefinition;
    let publisher: BaseEventPublishers.BaseEventPublisher;
    let roundsRepository: mongoose.Model<IRound>;
    let logService: typeof logger;

    const gameManagementApiClientFactory = stub<GameManagementApiClientFactory>();

    beforeEach(() => {
        gameData = {
            ingame: {},
        } as GameData;

        gameDefinition = {
            configName: "testGame",
            botSettings: {
                joinConfigs: {
                    numberOfBots: [1, 2, 3],
                    rate: [0.5, 0.3, 0.2],
                } as any,
                leaveConfigs: {
                    numberOfBots: [1, 2],
                    rate: [0.7, 0.3],
                } as any,
            },
        } as any;

        publisher = {
            publishToUser: jest.fn(),
        } as unknown as BaseEventPublishers.BaseEventPublisher;

        roundsRepository = {
            updateOne: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        } as unknown as mongoose.Model<IRound>;

        logService = {
            logError: jest.fn(),
            logInfo: jest.fn(),
        } as unknown as typeof logger;

        botInstance = new Bot(gameManagementApiClientFactory, gameData, gameDefinition, publisher, roundsRepository, logService);

        botInstance.chance = new Chance();

        botInstance.gameManagementApiClient = {
            users: {
                getAllBots: jest.fn().mockReturnValue([]),
                updateBotsJoinRoom: jest.fn(),
                updateBotsOutRoom: jest.fn().mockReturnValue({} as any),
            },
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("handleBotsInTable", () => {
        it("should add bots to the table if conditions are met", async () => {
            // Arrange
            const tableInGame: any = {
                botsInTable: [],
                canAddBot: true,
                freeBotSlots: BOT_SLOTS,
                name: "testTable",
            };

            jest.spyOn(botInstance, "addBotsToTableAndPublish").mockImplementation(async () => {});

            // Act
            await botInstance.handleBotsInTable(tableInGame);

            // Assert
            expect(botInstance.addBotsToTableAndPublish).toHaveBeenCalledWith(tableInGame);
        });

        it("should not add bots if conditions are not met", async () => {
            // Arrange
            const tableInGame: any = {
                botsInTable: new Array(MAX_BOTS_ON_TABLE),
                canAddBot: false,
            };

            jest.spyOn(botInstance, "addBotsToTableAndPublish").mockImplementation(async () => {});

            // Act
            await botInstance.handleBotsInTable(tableInGame);

            // Assert
            expect(botInstance.addBotsToTableAndPublish).not.toHaveBeenCalled();
        });
    });

    describe("getBotsToJoin", () => {
        it("should retrieve and shuffle bots", async () => {
            // Arrange
            const bots = [{ id: "bot1" }, { id: "bot2" }];
            (getOrDefault as jest.Mock).mockResolvedValue(bots);
            (shuffle as jest.Mock).mockReturnValue(bots);

            // Act
            const result = await botInstance.getBotsToJoin(2);

            // Assert
            expect(getOrDefault).toHaveBeenCalledWith([], []);
            expect(post).toHaveBeenCalled();
            expect(shuffle).toHaveBeenCalledWith(bots);
            expect(result).toEqual(bots);
        });
    });

    describe("removeBots", () => {
        it("should remove bots and call updateBotsOutRoom", async () => {
            // Arrange
            botInstance.botsInGame = [{ id: "bot1" }, { id: "bot2" }] as any;

            // Act
            await botInstance.removeBots(["bot1"]);

            // Assert
            expect(botInstance.botsInGame).toEqual([{ id: "bot2" }]);
            expect(post).toHaveBeenCalledWith({});
        });
    });

    describe("addBotsToTableAndPublish", () => {
        it("should add bots to the table and publish", async () => {
            // Arrange
            const tableInGame: any = {
                botsInTable: [],
                freeBotSlots: [0, 1, 2],
                canAddBot: true,
                name: "testTable",
                socketId: "socket123",
            };

            botInstance.botsInGame = [];
            botInstance.maxNumberOfBots = 100;
            jest.spyOn(botInstance, "getBotsToJoin").mockResolvedValue([
                { id: "bot1", name: "Bot 1", red: true, avatarId: "avatar1" },
            ] as any);

            botInstance.chance = {
                weighted: jest.fn().mockReturnValue(1),
                pickone: jest.fn().mockReturnValue(1),
            } as any;

            botInstance.gameData.ingame[tableInGame.name] = {} as any;
            // Act
            await botInstance.addBotsToTableAndPublish(tableInGame);

            // Assert
            expect(tableInGame.botsInTable).toHaveLength(1);
            expect(botInstance.botsInGame).toHaveLength(1);
            expect(publisher.publishToUser).toHaveBeenCalledWith(tableInGame.socketId, {
                otherPlayers: tableInGame.botsInTable,
            });
        });
    });

    describe("removeAllBotsFromTable", () => {
        it("should remove all bots from the table", async () => {
            // Arrange
            const tableInGame: any = {
                botsInTable: [{ id: "bot1" }, { id: "bot2" }],
                freeBotSlots: [],
            };

            jest.spyOn(botInstance, "removeBots").mockImplementation(async () => {});

            // Act
            await botInstance.removeAllBotsFromTable(tableInGame);

            // Assert
            expect(botInstance.removeBots).toHaveBeenCalledWith(["bot1", "bot2"]);
            expect(tableInGame.botsInTable).toEqual([]);
            expect(tableInGame.freeBotSlots).toEqual(BOT_SLOTS);
        });
    });

    describe("removeSomeBotsFromTable", () => {
        it("should remove some bots from the table", async () => {
            // Arrange
            const tableInGame: any = {
                botsInTable: [
                    { id: "bot1", slot: 1 },
                    { id: "bot2", slot: 2 },
                ],
                freeBotSlots: [],
                socketId: "socket123",
            };

            jest.spyOn(botInstance, "removeBots").mockImplementation(async () => {});
            jest.spyOn(botInstance.chance, "pickset").mockReturnValue(["bot1"]);

            // Act
            await botInstance.removeSomeBotsFromTable(tableInGame);

            // Assert
            expect(botInstance.removeBots).toHaveBeenCalledWith(["bot1"]);
            expect(tableInGame.botsInTable).toHaveLength(1);
            expect(tableInGame.freeBotSlots).toContain(1);
            expect(publisher.publishToUser).toHaveBeenCalledWith(tableInGame.socketId, {
                otherPlayers: tableInGame.botsInTable,
            });
        });
    });
});
