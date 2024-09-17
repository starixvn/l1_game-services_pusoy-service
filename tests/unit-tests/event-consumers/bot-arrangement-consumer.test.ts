import BotArrangementConsumer from "../../../src/consumers/bot-arrangement-consumer";
import { RoundOfTable, TableInGame } from "../../../src/game-data";
import { IRound } from "../../../src/models/rounds";
import { IBot } from "../../../src/models/bots";
import GameDefinition from "../../../src/game-definition";
import mongoose from "mongoose";
import { logger } from "sc-common";
import axios from "axios";
import { retry } from "../../../src/helpers";

jest.mock("axios");
jest.mock("../../../src/helpers", () => ({
    retry: jest.fn(),
    shuffle: jest.fn(() => ["http://fake-bot-url.com"]),
}));
jest.mock("sc-common", () => ({
    logger: {
        logError: jest.fn(),
    },
}));
jest.mock("chance", () => {
    return jest.fn().mockImplementation(() => ({
        integer: jest.fn(() => 5), // Mocked integer generator
    }));
});

describe("BotArrangementConsumer", () => {
    let botArrangementConsumer: BotArrangementConsumer;
    let roundsRepository: mongoose.Model<IRound>;
    let botsRepository: mongoose.Model<IBot>;
    let logService: typeof logger;
    let definition: GameDefinition;

    beforeEach(() => {
        roundsRepository = {
            findOneAndUpdate: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        } as unknown as mongoose.Model<IRound>;

        botsRepository = {
            create: jest.fn(),
        } as unknown as mongoose.Model<IBot>;

        logService = logger;
        definition = {
            durations: {
                timeline: {
                    arrangement: 10,
                },
            },
        } as GameDefinition;

        botArrangementConsumer = new BotArrangementConsumer(roundsRepository, logService, definition, botsRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getDataFromBotApi", () => {
        it("should fetch data from bot API and return bot URL and hand result", async () => {
            // Arrange
            const cards = [1, 2, 3, 4, 5];
            const responseData = {
                data: {
                    output: {
                        segment_1: [1, 2, 3],
                        segment_2: [4, 5, 6],
                        segment_3: [7, 8, 9],
                    },
                },
            };

            (axios.post as jest.Mock).mockResolvedValue(responseData);

            // Act
            const result = await botArrangementConsumer.getDataFromBotApi(cards);

            // Assert
            expect(result).toEqual({
                botUrl: "http://fake-bot-url.com",
                handResult: {
                    front: [7, 8, 9],
                    middle: [4, 5, 6],
                    back: [1, 2, 3],
                },
            });

            expect(axios.post).toHaveBeenCalledWith("http://fake-bot-url.com", expect.any(Object));
        });

        it("should log error and throw if API call fails", async () => {
            const cards = [1, 2, 3, 4, 5];

            (axios.post as jest.Mock).mockRejectedValue(new Error("API Error"));

            await expect(botArrangementConsumer.getDataFromBotApi(cards)).rejects.toThrow("API Error");
            expect(logService.logError).toHaveBeenCalledWith(`Error fetching data from bot API: http://fake-bot-url.com`);
        });
    });

    describe("getArrangementFromBot", () => {
        it("should return bot arrangement data", async () => {
            // Arrange
            const result = {
                playerId: "player1",
                hand: {
                    front: [1, 2, 3],
                    middle: [4, 5, 6],
                    back: [7, 8, 9],
                },
            } as any;
            const roundData = {
                remainingTime: 5,
                otherPlayers: [],
                result: {},
            } as any;

            const botApiResult = {
                botUrl: "http://fake-bot-url.com",
                handResult: {
                    front: [],
                    middle: [2],
                    back: [1, 3],
                },
            };
            (retry as jest.Mock).mockResolvedValue(botApiResult);
            botArrangementConsumer.getBotArrangeTime = jest.fn().mockReturnValue(5);

            // Act
            const botArrangement = await botArrangementConsumer.getArrangementFromBot(result, roundData);

            // Assert
            expect(botArrangement).toEqual({
                playerId: "player1",
                hand: botApiResult.handResult,
                botUrl: "http://fake-bot-url.com",
                arrangeTime: 5,
            });
        });

        it("should return an empty object if bot arrangement fails", async () => {
            // Arrange
            const handResult: any = {
                hand: {
                    front: [1],
                    middle: [2],
                    back: [3],
                },
                playerId: "bot1",
            };
            const roundData: any = {
                remainingTime: 10,
                otherPlayers: [],
                result: {},
            };

            (retry as jest.Mock).mockRejectedValue(new Error("Retry failed"));

            // Act
            const result = await botArrangementConsumer.getArrangementFromBot(handResult, roundData);

            // Assert
            expect(result).toEqual({});
        });
    });

    describe("getBotArrangeTime", () => {
        it("should return a random integer within valid range", () => {
            // Act
            const arrangeTime = botArrangementConsumer.getBotArrangeTime(10);

            // Assert
            expect(arrangeTime).toEqual(5);
        });
    });

    describe("handleBotArrangements", () => {
        it("should update bot arrangements in the round data and database", async () => {
            // Arrange
            const roundData: any = {
                roundId: 1,
                remainingTime: 5,
                otherPlayers: [{ id: "bot1" }],
                result: {
                    bot1: {
                        hand: {
                            front: [1],
                            middle: [2],
                            back: [3],
                        },
                        playerId: "bot1",
                    },
                },
            };

            const tableData: TableInGame = {
                roundData,
            } as TableInGame;

            botArrangementConsumer.getArrangementFromBot = jest.fn().mockResolvedValue({
                playerId: "bot1",
                hand: {
                    front: [],
                    middle: [2],
                    back: [1, 3],
                },
                botUrl: "http://fake-bot-url.com",
                arrangeTime: 4,
            });
            botArrangementConsumer.updateBotHandResultToDatabase = jest.fn();
            botArrangementConsumer.updateBotToDatabase = jest.fn();

            // Act
            await botArrangementConsumer.handleBotArrangements(tableData);

            // Assert
            expect(roundData.result["bot1"].hand).toEqual({
                front: [],
                middle: [2],
                back: [1, 3],
            });
            expect(roundData.otherPlayers[0].arrangeTime).toEqual(4);
            expect(botArrangementConsumer.updateBotHandResultToDatabase).toHaveBeenCalledWith(tableData, "bot1");
            expect(botArrangementConsumer.updateBotToDatabase).toHaveBeenCalled();
        });
    });

    describe("updateBotHandResultToDatabase", () => {
        it("should update the bot's hand result in the database", async () => {
            // Arrange
            const roundData: any = {
                roundId: 1,
                result: {
                    bot1: {
                        hand: {
                            front: [1],
                            middle: [2],
                            back: [3],
                        },
                        playerId: "bot1",
                    },
                },
            };

            const tableData: TableInGame = {
                roundData,
            } as TableInGame;

            // Act
            await botArrangementConsumer.updateBotHandResultToDatabase(tableData, "bot1");

            // Assert
            expect(roundsRepository.findOneAndUpdate).toHaveBeenCalledWith({ id: 1 }, { "result.bot1": roundData.result["bot1"] });
        });
    });

    describe("updateBotToDatabase", () => {
        it("should save bot data to the database", async () => {
            // Arrange
            const tableData: TableInGame = {
                roundData: {
                    roundId: 1,
                } as RoundOfTable,
            } as TableInGame;

            const botData = {
                playerId: "bot1",
                botUrl: "http://fake-bot-url.com",
            } as any;

            // Act
            await botArrangementConsumer.updateBotToDatabase(tableData, botData);

            // Assert
            expect(botsRepository.create).toHaveBeenCalledWith({
                botId: "bot1",
                roundId: 1,
                botUrl: "http://fake-bot-url.com",
            });
        });
    });
});
