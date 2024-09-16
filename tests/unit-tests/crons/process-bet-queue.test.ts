import ProcessBetQueue from "../../../src/crons/process-bet-queue";
import GameData, { RealPlayer, TableInGame } from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import mongoose from "mongoose";
import BaseMetrics from "sc-game-base/src/core/base-metrics";
import { RoundResultPublisher } from "../../../src/publishers";
import { BetPayload } from "../../../src/consumers/place-bet-consumer";
import * as Helper from "../../../src/helpers";
import { stub } from "jest-auto-stub";
import { Core } from "sc-game-base";
import { IRound } from "../../../src/models/rounds";

jest.mock("../../../src/helpers", () => ({
    dealHands: jest.fn(),
}));

describe("ProcessBetQueue", () => {
    let processBetQueue: ProcessBetQueue;
    const definition = stub<GameDefinition>();
    const gameData = stub<GameData>();
    const placeBetPublisher = stub<Core.BaseEventPublishers.PlaceBetPublisher>();
    const roundResultPublisher = stub<RoundResultPublisher>();
    const placeBet = jest.fn();
    const gameManagementApiClientFactory = stub<GameManagementApiClientFactory>();
    const roundsRepository = {
        findOneAndUpdate: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    } as unknown as mongoose.Model<IRound>;

    definition.durations = {
        timeline: {
            animation: 10,
            deal: 5,
            arrangement: 3,
            transition: 2,
        },
    } as any;

    const baseMetrics = stub<BaseMetrics>();

    beforeEach(() => {
        processBetQueue = new ProcessBetQueue({
            definition,
            gameData,
            placeBetPublisher,
            placeBet,
            logService: null as any,
            betsRepository: {} as any,
            betLogsRepository: {} as any,
            gameManagementApiClientFactory,
            baseMetrics,
            roundResultPublisher,
            roundsRepository,
        });

        gameData.disabled = false;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("proceedBet", () => {
        it("should publish um_message if the game is disabled", async () => {
            // Arrange
            gameData.disabled = true;
            const player: RealPlayer = {
                UID: "player1",
                profile: { name: "Player One" },
                session: {},
            } as RealPlayer;
            const payload: BetPayload = {
                amount: 100,
                roundId: 1,
                receivedTime: new Date(),
            } as BetPayload;

            // Act
            await processBetQueue.proceedBet(player, payload);

            // Assert
            expect(placeBetPublisher.publishToUser).toHaveBeenCalledWith(player.UID, {
                um: true,
                um_message: gameData.umMessages,
            });
        });

        it("should add the bet to betQueue if there are no bots in the table", async () => {
            // Arrange
            const player: RealPlayer = {
                UID: "player1",
                profile: { name: "Player One" },
                session: {},
            } as RealPlayer;
            const payload: BetPayload = {
                amount: 100,
                roundId: 1,
                receivedTime: new Date(),
            } as BetPayload;

            gameData.ingame[player.profile.name] = {
                botsInTable: [],
                betQueue: [],
            } as any;

            // Act
            await processBetQueue.proceedBet(player, payload);

            // Assert
            expect(gameData.ingame[player.profile.name].betQueue).toHaveLength(1);
        });

        it("should handle successful bet processing", async () => {
            // Arrange
            const player: RealPlayer = {
                UID: "player1",
                profile: { name: "Player One" },
                session: { playerId: "session1" },
            } as RealPlayer;
            const payload: BetPayload = {
                amount: 100,
                roundId: 1,
                receivedTime: new Date(),
            } as BetPayload;

            gameData.ingame[player.profile.name] = {
                botsInTable: [{}],
                betQueue: [],
                roundData: null,
            } as any;

            jest.spyOn(processBetQueue, "stubPlaceBet").mockResolvedValue({ isOk: true, response: {} });
            jest.spyOn(processBetQueue, "handleSuccessBet").mockImplementation(async () => {});

            // Act
            await processBetQueue.proceedBet(player, payload);

            // Assert
            expect(processBetQueue.stubPlaceBet).toHaveBeenCalled();
            expect(processBetQueue.handleSuccessBet).toHaveBeenCalled();
        });
    });

    describe("initNewRound", () => {
        it("should initialize a new round", () => {
            // Arrange
            const player: RealPlayer = {
                UID: "player1",
                profile: { name: "Player One" },
                session: { playerId: "session1" },
            } as RealPlayer;
            const payload: BetPayload = { amount: 100, roundId: 1 } as BetPayload;

            gameData.ingame[player.profile.name] = {
                botsInTable: [{}],
            } as TableInGame;

            // Act
            processBetQueue.initNewRound(player, payload);

            // Assert
            expect(gameData.ingame[player.profile.name].roundData).toBeDefined();
        });
    });

    describe("dealHandsAndPublish", () => {
        it("should deal hands and publish to players", () => {
            // Arrange
            const player: RealPlayer = {
                UID: "player1",
                profile: { name: "Player One" },
                session: { playerId: "session1" },
            } as RealPlayer;

            gameData.ingame[player.profile.name] = {
                roundData: {
                    otherPlayers: [{ id: "bot1", slot: 1 }],
                    result: {},
                },
                socketId: "socket123",
            } as TableInGame;

            (Helper.dealHands as jest.Mock).mockReturnValue([
                [1, 2, 3],
                [4, 5, 6],
            ]);

            // Act
            processBetQueue.dealHandsAndPublish(player);

            // Assert
            expect(roundResultPublisher.publishPusoyRound).toHaveBeenCalledWith(
                expect.objectContaining({
                    socketId: "socket123",
                    playerHand: expect.objectContaining({ hand: [1, 2, 3] }),
                })
            );
        });
    });

    describe("updateHandResultToDatabase", () => {
        it("should update hand results in the database", async () => {
            // Arrange
            const tableName = "Player One";
            gameData.ingame[tableName] = {
                roundData: {
                    roundId: 1,
                    result: { player1: { hand: [1, 2, 3] } },
                },
            } as any;

            // Act
            await processBetQueue.updateHandResultToDatabase(tableName);

            // Assert
            expect(roundsRepository.findOneAndUpdate).toHaveBeenCalledWith(
                { id: 1 },
                expect.objectContaining({ id: 1, result: { player1: { hand: [1, 2, 3] } } }),
                { upsert: true }
            );
        });
    });
});
