import SubmitArrangementConsumer, { SubmitPayload, RearrangePayload } from "../../../src/consumers/submit-arrangement-consumer";
import GameData from "../../../src/game-data";
import { Core } from "sc-game-base";
import GameDefinition from "../../../src/game-definition";
import mongoose from "mongoose";
import { IRound } from "../../../src/models/rounds";
import { Hand } from "@rd/pusoy-rules";
import { isSameCards } from "../../../src/helpers";

jest.mock("../../../src/helpers", () => ({
    isSameCards: jest.fn(),
}));

describe("SubmitArrangementConsumer", () => {
    let submitArrangementConsumer: SubmitArrangementConsumer;
    let roundsRepository: mongoose.Model<IRound>;
    let gameData: GameData;
    let publisher: Core.BaseEventPublishers.BaseEventPublisher;
    let definition: GameDefinition;

    beforeEach(() => {
        roundsRepository = {
            findOneAndUpdate: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        } as unknown as mongoose.Model<IRound>;

        gameData = {
            ingame: {},
        } as GameData;

        publisher = {
            publishToUser: jest.fn(),
        } as unknown as Core.BaseEventPublishers.BaseEventPublisher;

        definition = {
            durations: {
                timeline: {
                    arrangement: 10,
                },
            },
        } as GameDefinition;

        submitArrangementConsumer = new SubmitArrangementConsumer(roundsRepository, gameData, publisher, definition);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("consume", () => {
        it("should submit the hand if it is a valid submission", async () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    submittedPlayers: [],
                    realPlayerSubmitted: false,
                },
                socketId: "socket123",
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;
            (isSameCards as jest.Mock).mockReturnValue(true);

            // Act
            await submitArrangementConsumer.consume(data);

            // Assert
            expect(tableData.roundData.result[data.playerId].hand).toEqual(data.hand);
            expect(tableData.roundData.realPlayerSubmitted).toBe(true);
            expect(publisher.publishToUser).toHaveBeenCalledWith(tableData.socketId, {
                submittedPlayer: { id: data.playerId, name: data.playerName },
            });
            expect(roundsRepository.findOneAndUpdate).toHaveBeenCalledWith(
                { id: tableData.roundData.roundId },
                { [`result.${data.playerId}`]: tableData.roundData.result[data.playerId] }
            );
        });

        it("should publish validSubmitted as false if submission is invalid", async () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    submittedPlayers: [],
                    realPlayerSubmitted: false,
                },
                socketId: "socket123",
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;
            (isSameCards as jest.Mock).mockReturnValue(false);

            // Act
            await submitArrangementConsumer.consume(data);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(tableData.socketId, { validSubmitted: false });
            expect(roundsRepository.findOneAndUpdate).not.toHaveBeenCalled();
        });
    });

    describe("consumeRearrangeCards", () => {
        it("should allow rearrangement of cards when within arrangement timeline", () => {
            // Arrange
            const data = {
                playerId: "player1",
                playerName: "Player One",
            };

            const tableData: any = {
                roundData: {
                    remainingTime: 5,
                    submittedPlayers: [{ id: "player1", name: "Player One" }],
                    realPlayerSubmitted: true,
                },
                socketId: "socket123",
            };

            gameData.ingame[data.playerName] = tableData;

            // Act
            submitArrangementConsumer.consumeRearrangeCards(data);

            // Assert
            expect(tableData.roundData.submittedPlayers).toEqual([]);
            expect(tableData.roundData.realPlayerSubmitted).toBe(false);
            expect(publisher.publishToUser).toHaveBeenCalledWith(tableData.socketId, {
                rearrangePlayer: {
                    playerId: data.playerId,
                    playerName: data.playerName,
                    canRearrange: true,
                },
            });
        });

        it("should not allow rearrangement of cards when outside arrangement timeline", () => {
            // Arrange
            const data = {
                playerId: "player1",
                playerName: "Player One",
            };

            const tableData: any = {
                roundData: {
                    remainingTime: 11,
                    submittedPlayers: [{ id: "player1", name: "Player One" }],
                    realPlayerSubmitted: true,
                },
                socketId: "socket123",
            };

            gameData.ingame[data.playerName] = tableData;

            // Act
            submitArrangementConsumer.consumeRearrangeCards(data);

            // Assert
            expect(tableData.roundData.submittedPlayers).toHaveLength(1);
            expect(tableData.roundData.realPlayerSubmitted).toBe(true);
            expect(publisher.publishToUser).toHaveBeenCalledWith(tableData.socketId, {
                rearrangePlayer: {
                    playerId: data.playerId,
                    playerName: data.playerName,
                    canRearrange: false,
                },
            });
        });
    });

    describe("isValidSubmit", () => {
        it("should return true for a valid submission", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    realPlayerSubmitted: false,
                },
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;
            (isSameCards as jest.Mock).mockReturnValue(true);

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(true);
        });

        it("should return false for an invalid submission", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 2,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    realPlayerSubmitted: true,
                },
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;
            (isSameCards as jest.Mock).mockReturnValue(false);

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if data is missing", () => {
            // Arrange
            const data = null;

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data as any);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if playerName is missing", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if playerId is missing", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if hand is missing", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: null as any,
                roundId: 1,
                submit: true,
            };

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if roundId is missing", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: null as any,
                submit: true,
            };

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if tableData is missing", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            gameData.ingame[data.playerName] = null as any;

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if currentRound is missing", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            gameData.ingame[data.playerName] = { roundData: null } as any;

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if roundId does not match", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 2,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    realPlayerSubmitted: false,
                },
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if playerId does not match", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player2",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    realPlayerSubmitted: false,
                },
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return false if realPlayerSubmitted is true", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    realPlayerSubmitted: true,
                },
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(false);
        });

        it("should return true for a valid submission", () => {
            // Arrange
            const data: SubmitPayload = {
                playerId: "player1",
                playerName: "Player One",
                hand: { front: [], middle: [], back: [] } as Hand<number[]>,
                roundId: 1,
                submit: true,
            };

            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                    realPlayerSubmitted: false,
                },
                playerId: "player1",
            };

            gameData.ingame[data.playerName] = tableData;
            (isSameCards as jest.Mock).mockReturnValue(true);

            // Act
            const isValid = submitArrangementConsumer.isValidSubmit(data);

            // Assert
            expect(isValid).toBe(true);
        });
    });

    describe("updatePlayerHandResultToDatabase", () => {
        it("should update the player's hand result in the database", async () => {
            // Arrange
            const tableData: any = {
                roundData: {
                    roundId: 1,
                    result: {
                        player1: { hand: { front: [], middle: [], back: [] } },
                    },
                },
            };

            const playerId = "player1";

            // Act
            await submitArrangementConsumer.updatePlayerHandResultToDatabase(tableData, playerId);

            // Assert
            expect(roundsRepository.findOneAndUpdate).toHaveBeenCalledWith(
                { id: tableData.roundData.roundId },
                { [`result.${playerId}`]: tableData.roundData.result[playerId] }
            );
        });
    });
});
