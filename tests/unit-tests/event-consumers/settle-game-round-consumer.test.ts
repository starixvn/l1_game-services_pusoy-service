import SettleGameRoundConsumer from "../../../src/consumers/settle-game-round-consumer";
import { IRound, Settlement } from "../../../src/models/rounds";
import GameDefinition from "../../../src/game-definition";
import GameData, { RoundOfTable, TableInGame } from "../../../src/game-data";
import { RoundResultPublisher } from "sc-game-base/src/core/event-publishers";
import mongoose from "mongoose";
import { stub } from "jest-auto-stub";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";

jest.mock("mongoose");

describe("SettleGameRoundConsumer", () => {
    let settleGameRoundConsumer: SettleGameRoundConsumer;
    let roundsRepository: mongoose.Model<IRound>;
    let botsRepository: mongoose.Model<any>;
    let gameData: GameData;
    let gameDefinition: GameDefinition;
    let roundResultPublisher: RoundResultPublisher;
    const gameManagementApiClientFactory = stub<GameManagementApiClientFactory>();

    beforeEach(() => {
        roundsRepository = {
            updateOne: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        } as unknown as mongoose.Model<IRound>;

        botsRepository = {
            findOneAndUpdate: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        } as unknown as mongoose.Model<any>;

        gameDefinition = {
            durations: {
                animation: {
                    natural: 1,
                    pusoy: {
                        full: 1,
                        mini: 1,
                    },
                    crack: 1,
                    normal: 1,
                    chipFly: 1,
                },
            },
            settle: jest.fn().mockReturnValue([]), // Mock settle function to return an empty array
        } as unknown as GameDefinition;

        gameData = {} as GameData;
        roundResultPublisher = {
            publishRoundResult: jest.fn(),
        } as unknown as RoundResultPublisher;

        settleGameRoundConsumer = new SettleGameRoundConsumer({
            definition: gameDefinition,
            gameData,
            roundResultPublisher,
            userBetResultPublisher: {} as any,
            endGame: jest.fn(),
            roundsRepository,
            betsRepository: {} as any,
            gameManagementApiClientFactory: gameManagementApiClientFactory,
            botsRepository,
        });
    });

    describe("settleTable", () => {
        it("should process settlements and return total settle effect duration", async () => {
            // Arrange
            const roundData: any = {
                roundId: 1,
                result: {
                    player1: {
                        slot: 0,
                        hand: {},
                        playerId: "player1",
                    },
                    player2: {
                        slot: 1,
                        hand: {},
                        playerId: "player2",
                    },
                },
            };

            const tableData: TableInGame = {
                roundData,
                socketId: "socket123",
                playerId: "player1",
            } as TableInGame;

            gameDefinition.settle = jest.fn().mockReturnValue([
                {
                    sum: 100,
                    natural: { name: "NaturalName" },
                    pusoy: { full: 0, mini: {} },
                    crack: { isCrack: false },
                },
                {
                    sum: -100,
                    natural: { name: "Unknown" },
                    pusoy: { full: 0, mini: {} },
                    crack: { isCrack: false },
                },
            ]);

            settleGameRoundConsumer.updateBotScore = jest.fn();
            settleGameRoundConsumer.updateBalance = jest.fn();

            // Act
            const totalSettleEffectDuration = await settleGameRoundConsumer.settleTable(tableData);

            // Assert
            expect(totalSettleEffectDuration).toBeGreaterThan(0);
            expect(roundsRepository.updateOne).toHaveBeenCalledWith({ id: roundData.roundId }, { settlementResult: expect.any(Object) });
            expect(roundResultPublisher.publishRoundResult).toHaveBeenCalledWith(expect.any(Object));
        });

        it("should handle a tie where all settlement sums are zero", async () => {
            // Arrange
            const roundData: any = {
                roundId: 1,
                result: {
                    player1: {
                        slot: 0,
                        hand: {},
                        playerId: "player1",
                    },
                    player2: {
                        slot: 1,
                        hand: {},
                        playerId: "player2",
                    },
                },
            };

            const tableData: TableInGame = {
                roundData,
                socketId: "socket123",
                playerId: "player1",
            } as TableInGame;

            settleGameRoundConsumer.updateBalance = jest.fn();

            gameDefinition.settle = jest.fn().mockReturnValue([
                {
                    sum: 0,
                    natural: {
                        name: "",
                        units: 0,
                    },
                    pusoy: { full: 0, mini: {} },
                    crack: { isCrack: false },
                },
                {
                    sum: 0,
                    natural: {
                        name: "",
                        units: 0,
                    },
                    pusoy: { full: 0, mini: {} },
                    crack: { isCrack: false },
                },
            ]);

            // Act
            const totalSettleEffectDuration = await settleGameRoundConsumer.settleTable(tableData);

            // Assert
            expect(totalSettleEffectDuration).toBe(1);
            expect(roundsRepository.updateOne).toHaveBeenCalledWith({ id: roundData.roundId }, { settlementResult: expect.any(Object) });
            expect(roundResultPublisher.publishRoundResult).toHaveBeenCalledWith(expect.any(Object));
        });
    });

    describe("updateBotScore", () => {
        it("should update the bot's score in the database", async () => {
            // Arrange
            const tableData: TableInGame = {
                roundData: {
                    roundId: 1,
                } as RoundOfTable,
            } as TableInGame;

            const settlementResult: Settlement = {
                playerId: "bot1",
                sum: 100,
            } as Settlement;

            // Act
            await settleGameRoundConsumer.updateBotScore(tableData, settlementResult);

            // Assert
            expect(botsRepository.findOneAndUpdate).toHaveBeenCalledWith({ roundId: 1, botId: "bot1" }, { score: 100 });
        });
    });

    describe("updateBalance", () => {
        it("should update the bot's balance in round data", () => {
            // Arrange
            const roundData: RoundOfTable = {
                otherPlayers: [
                    {
                        id: "bot1",
                        balance: 0,
                    },
                ],
            } as RoundOfTable;

            const tableData: TableInGame = {
                roundData,
                playerId: "player1",
                balance: 0,
            } as TableInGame;

            const settlementResult: Settlement = {
                playerId: "bot1",
                sum: 100,
            } as Settlement;

            // Act
            settleGameRoundConsumer.updateBalance(tableData, settlementResult);

            // Assert
            expect(roundData.otherPlayers[0].balance).toBe(100);
        });

        it("should update the player's balance in table data", () => {
            // Arrange
            const roundData: RoundOfTable = {
                otherPlayers: [
                    {
                        id: "bot1",
                        balance: 0,
                    },
                ],
            } as RoundOfTable;

            const tableData: TableInGame = {
                roundData,
                playerId: "player1",
                balance: 0,
            } as TableInGame;

            const settlementResult: Settlement = {
                playerId: "player1",
                sum: 200,
            } as Settlement;

            // Act
            settleGameRoundConsumer.updateBalance(tableData, settlementResult);

            // Assert
            expect(tableData.balance).toBe(200);
        });
    });
});
