import { stub } from "jest-auto-stub";
import { InGameConsumer } from "../../../src/consumers";
import GameDefinition from "../../../src/game-definition";
import GameData, { RealPlayer, RoundOfTable, TableInGame } from "../../../src/game-data";
import { Core } from "sc-game-base";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import mongoose from "mongoose";
import { ISurvey } from "../../../src/models/survey";
import scoreConfig from "../../../src/score-config";
import { BOT_SLOTS, DEFAULT_BALANCE } from "../../../src/constants";

describe("InGameConsumer tests", () => {
    const definition = stub<GameDefinition>();
    const gameData = stub<GameData>();
    const roundQuery = stub<Core.QueryApis.RoundQuery>();
    const publisher = stub<Core.BaseEventPublishers.BaseEventPublisher>();
    const getBalance = jest.fn();
    const gameManagementApiClientFactory = stub<GameManagementApiClientFactory>();
    const surveyRepository = stub<mongoose.Model<ISurvey>>();

    let consumer: InGameConsumer;

    beforeEach(() => {
        consumer = new InGameConsumer(
            definition,
            gameData,
            roundQuery,
            publisher,
            getBalance,
            gameManagementApiClientFactory,
            surveyRepository
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("buildPayload", () => {
        it("should return expected when game not disabled", async () => {
            // arrange
            const gameConfigs = {
                odds: { choice1: 0, choice2: 0 },
                enableFreeBet: false,
                enabled: true,
            };

            const gameSettings = {
                durations: {},
                suitesMapper: { 0: "spade", 1: "heart", 2: "club", 3: "diamond" },
            };

            consumer.gameData.gameConfigs = gameConfigs as any;
            consumer.definition = gameSettings as any;

            const currencyGroupGames = [{ groupId: "group", maxBet: { choice1: 2000, choice2: 2000 } }];
            consumer.gameData.currencyGroupGames = currencyGroupGames;
            const exchangeRates = { code: { USD: 1 } };
            consumer.gameData.exchangeRates = exchangeRates;
            const realPlayer = {
                profile: { name: "player1" },
                session: { currencyCode: "USD", multiplier: 1, currencyGroupId: "group" },
            } as RealPlayer;

            const user = { name: "John Doe" };
            const roundData = {
                roundId: 1,
                playerHand: {
                    front: [],
                    middle: [],
                    back: [],
                },
                remainingTime: 10,
            };

            const tableData = {
                roundData,
                balance: 1000,
                botsInTable: ["bot1", "bot2"],
            };

            consumer.gameData.ingame = {
                player1: tableData,
            } as any;

            consumer.getUserInfo = jest.fn().mockReturnValue(user);
            consumer.getGameConfigs = jest.fn().mockReturnValue(gameConfigs);
            consumer.getCurrentRoundData = jest.fn().mockReturnValue(roundData);

            const expectedPayload = {
                remainingTime: roundData.remainingTime,
                gameConfigs,
                pusoyRound: roundData,
                otherPlayers: tableData.botsInTable,
                user: { ...user, rate: 1 },
                surveyUpdated: false,
            };

            // act
            const actualPayload = await consumer.buildPayload(realPlayer);

            // assert
            expect(actualPayload).toEqual(expectedPayload);
        });
    });

    describe("consume", () => {
        it("should process real player correctly", async () => {
            // arrange
            const gameConfigs = {
                odds: { choice1: 0, choice2: 0 },
                enableFreeBet: false,
                enabled: true,
            };
            consumer.gameData.gameConfigs = gameConfigs as any;

            const realPlayer = {
                UID: "2",
                profile: { name: "player2" },
                session: { currencyCode: "USD", multiplier: 1, currencyGroupId: "group" },
            } as RealPlayer;
            consumer.initOrUpdateTable = jest.fn();
            consumer.buildPayload = jest.fn().mockResolvedValue({});
            consumer.publisher.publishToUser = jest.fn();

            // act
            await consumer.consume(realPlayer);

            // assert
            expect(consumer.initOrUpdateTable).toHaveBeenCalledWith(realPlayer);
            expect(consumer.buildPayload).toHaveBeenCalledWith(realPlayer);
            expect(consumer.publisher.publishToUser).toHaveBeenCalled();
        });

        it("should not proceed if the game is disabled", async () => {
            // arrange
            const realPlayer = {
                UID: "2",
                profile: { name: "player2" },
                session: { currencyCode: "USD", multiplier: 1, currencyGroupId: "group" },
            } as RealPlayer;
            consumer.gameData.gameConfigs = { enabled: false } as any;

            realPlayer.socketClient = { emit: jest.fn() } as any;

            consumer.definition.name = "pusoy";
            consumer.gameData.umMessages = "game_disabled";

            consumer.initOrUpdateTable = jest.fn();
            consumer.buildPayload = jest.fn().mockResolvedValue({});
            consumer.publisher.publishToUser = jest.fn();

            // act
            await consumer.consume(realPlayer);

            // assert
            expect(realPlayer.socketClient.emit).toHaveBeenCalledWith(consumer.definition.name, {
                um: true,
                um_message: "game_disabled",
            });
            expect(consumer.initOrUpdateTable).not.toHaveBeenCalled();
            expect(consumer.buildPayload).toHaveBeenCalled();
            expect(consumer.publisher.publishToUser).toHaveBeenCalled();
        });
    });

    describe("getGameConfigs", () => {
        it("should return game configs for given currency group id", () => {
            // arrange
            const currencyGroupId = "group1";

            const currencyGroupGames = [{ groupId: "group1", maxBet: { choice1: 2000, choice2: 2000 } }];
            consumer.gameData.currencyGroupGames = currencyGroupGames;

            consumer.definition = {
                durations: { timeline: { transition: 10 } },
                suitesMapper: { 0: "spade", 1: "heart", 2: "club", 3: "diamond" },
                scoreConfig,
            } as any;

            const expectResult = { ...currencyGroupGames[0], ...consumer.definition };

            // act
            const actualGameConfigs = consumer.getGameConfigs(currencyGroupId);

            // assert
            expect(actualGameConfigs).toEqual(expectResult);
        });
    });

    describe("getCurrentRoundData", () => {
        it("should return current round data for real player", () => {
            // arrange
            const realPlayer = {
                UID: "3",
                profile: { name: "player3" },
                session: { currencyCode: "USD", multiplier: 1, currencyGroupId: "group", playerId: "id1" },
            } as RealPlayer;

            const playerHand = {
                hand: {
                    front: [22, 43, 33],
                    middle: [30, 40, 5, 3, 41],
                    back: [29, 42, 39, 12, 11],
                },
                slot: 0,
                playerId: "id1",
            };
            const roundData = {
                remainingTime: 50,
                showingResultTime: 0,
                roundId: 1,
                otherPlayers: [],
                result: {
                    id1: playerHand,
                } as any,
                submittedPlayers: [],
                realPlayerSubmitted: false,
                isSettled: false,
            } as RoundOfTable;

            const tableData = {
                name: "player3",
                roundData,
                balance: 1000,
            } as TableInGame;
            consumer.gameData.ingame["player3"] = tableData;

            const expectedRoundData = {
                submittedPlayers: [],
                remainingTime: 50,
                roundId: 1,
                playerHand,
                otherPlayers: roundData.otherPlayers,
                playerBalance: tableData.balance,
            };

            // act
            const actualRoundData = consumer.getCurrentRoundData(realPlayer);

            // assert
            expect(actualRoundData).toEqual(expectedRoundData);
        });
    });

    describe("initOrUpdateTable", () => {
        describe("when table is not exist", () => {
            it("should initialize new table", async () => {
                // arrange
                const realPlayer = {
                    UID: "3",
                    profile: { name: "player3" },
                    session: {
                        currencyCode: "USD",
                        multiplier: 1,
                        currencyGroupId: "group",
                        playerId: "id1",
                        operatorId: "1",
                        system: "system",
                        currencyName: "USD",
                    },
                } as RealPlayer;

                consumer.gameData.ingame["player3"] = {
                    name: "player3",
                } as TableInGame;

                const expectedTable = {
                    canDestroy: false,
                    canAddBot: true,
                    socketId: "3",
                    playerId: "id1",
                    name: "player3",
                    currency: "USD",
                    system: "system",
                    betQueue: [],
                    operatorId: "1",
                    botsInTable: [],
                    freeBotSlots: BOT_SLOTS,
                    balance: DEFAULT_BALANCE,
                };

                // act
                consumer.initOrUpdateTable(realPlayer);
                const newTable = consumer.gameData.ingame["player3"];
                // assert
                expect(newTable).toEqual(expectedTable);
            });
        });

        describe("when table is already exist", () => {
            it("should update table", async () => {
                // arrange
                const realPlayer = {
                    UID: "newUID",
                    profile: { name: "player3" },
                    session: {
                        currencyCode: "USD",
                        multiplier: 1,
                        currencyGroupId: "group",
                        playerId: "id1",
                        operatorId: "1",
                        system: "system",
                        currencyName: "USD",
                    },
                } as RealPlayer;

                const playerHand = {
                    hand: {
                        front: [22, 43, 33],
                        middle: [30, 40, 5, 3, 41],
                        back: [29, 42, 39, 12, 11],
                    },
                    slot: 0,
                    playerId: "id1",
                };
                const roundData = {
                    remainingTime: 50,
                    showingResultTime: 0,
                    roundId: 1,
                    otherPlayers: [],
                    result: {
                        id1: playerHand,
                    } as any,
                    submittedPlayers: [],
                    realPlayerSubmitted: false,
                    isSettled: false,
                } as RoundOfTable;

                consumer.gameData.ingame["player3"] = {
                    roundData,
                    canDestroy: true,
                    socketId: "UID",
                    playerId: "id1",
                    name: "player3",
                    currency: "USD",
                    system: "system",
                    betQueue: [],
                    operatorId: "1",
                    botsInTable: [] as any,
                } as TableInGame;

                // act
                consumer.initOrUpdateTable(realPlayer);
                const currentTable = consumer.gameData.ingame["player3"];
                // assert
                expect(currentTable).toEqual({
                    roundData,
                    canDestroy: false,
                    canAddBot: true,
                    socketId: "newUID",
                    playerId: "id1",
                    name: "player3",
                    currency: "USD",
                    system: "system",
                    betQueue: [],
                    operatorId: "1",
                    botsInTable: [],
                });
            });
        });
    });
});
