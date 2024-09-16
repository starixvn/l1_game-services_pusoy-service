import UserDisconnectConsumer from "../../../src/consumers/user-disconnect-consumer";
import GameData, { RealPlayer, TableInGame } from "../../../src/game-data";
import Bot from "../../../src/crons/bot";
import { Core } from "sc-game-base";

describe("UserDisconnectConsumer", () => {
    let userDisconnectConsumer: UserDisconnectConsumer;
    let gameData: GameData;
    let bot: Bot;
    let surveyRepository: any;

    beforeEach(() => {
        gameData = {
            realPlayers: {},
            ingame: {},
        } as GameData;

        bot = {
            removeAllBotsFromTable: jest.fn(),
        } as unknown as Bot;

        surveyRepository = jest.fn().mockImplementation((data) => {
            return { toObject: () => data };
        });

        surveyRepository.updateOne = jest.fn().mockReturnThis();
        surveyRepository.exec = jest.fn();

        userDisconnectConsumer = new UserDisconnectConsumer(gameData, bot, surveyRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("consume", () => {
        it("should update survey, update or delete table, and call parent consume", async () => {
            // Arrange
            const socketClient = { id: "socket123" };
            const realPlayer: RealPlayer = {
                profile: { name: "Player One" },
                session: { playerId: "player1" },
            } as RealPlayer;

            const tableData: any = {
                name: "Player One",
                canAddBot: true,
                roundData: null,
            };

            gameData.realPlayers[socketClient.id] = realPlayer;
            gameData.ingame[realPlayer.profile.name] = tableData;
            userDisconnectConsumer.updateSurvey = jest.fn();
            userDisconnectConsumer.updateOrDeleteTable = jest.fn();

            // Spy on super.consume
            const parentConsumeSpy = jest.spyOn(Core.BaseEventConsumers.UserDisconnectConsumer.prototype, "consume");

            // Act
            await userDisconnectConsumer.consume(socketClient);

            // Assert
            expect(userDisconnectConsumer.updateSurvey).toHaveBeenCalledWith(realPlayer);
            expect(userDisconnectConsumer.updateOrDeleteTable).toHaveBeenCalledWith(tableData);
            expect(parentConsumeSpy).toHaveBeenCalledWith(socketClient);
        });

        it("should do nothing if realPlayer is not found", async () => {
            // Arrange
            const socketClient = { id: "socket123" };

            userDisconnectConsumer.updateSurvey = jest.fn();
            userDisconnectConsumer.updateOrDeleteTable = jest.fn();
            // Spy on super.consume
            const parentConsumeSpy = jest.spyOn(Core.BaseEventConsumers.UserDisconnectConsumer.prototype, "consume");

            // Act
            await userDisconnectConsumer.consume(socketClient);

            // Assert
            expect(userDisconnectConsumer.updateSurvey).not.toHaveBeenCalled();
            expect(userDisconnectConsumer.updateOrDeleteTable).not.toHaveBeenCalled();
            expect(parentConsumeSpy).not.toHaveBeenCalled();
        });
    });

    describe("updateOrDeleteTable", () => {
        it("should delete table if roundData is null", async () => {
            // Arrange
            const tableData: any = {
                name: "Player One",
                canAddBot: true,
                roundData: null,
            };

            // Act
            await userDisconnectConsumer.updateOrDeleteTable(tableData);

            // Assert
            expect(bot.removeAllBotsFromTable).toHaveBeenCalledWith(tableData);
            expect(gameData.ingame[tableData.name]).toBeUndefined();
        });

        it("should mark table for destruction if roundData is present", async () => {
            // Arrange
            const tableData: TableInGame = {
                name: "Player One",
                canAddBot: true,
                roundData: {}, // Simulate round data present
            } as TableInGame;

            // Act
            await userDisconnectConsumer.updateOrDeleteTable(tableData);

            // Assert
            expect(tableData.canDestroy).toBe(true);
            expect(tableData.socketId).toBe("");
        });

        it("should do nothing if tableData is undefined", async () => {
            // Act
            await userDisconnectConsumer.updateOrDeleteTable(undefined as any);

            // Assert
            expect(bot.removeAllBotsFromTable).not.toHaveBeenCalled();
        });
    });

    describe("updateSurvey", () => {
        it("should upsert survey record for the player", async () => {
            // Arrange
            const realPlayer: RealPlayer = {
                profile: { name: "Player One" },
                session: { playerId: "player1" },
            } as RealPlayer;

            const survey = {
                playerId: realPlayer.session.playerId,
                playerName: realPlayer.profile.name,
            };

            // Act
            await userDisconnectConsumer.updateSurvey(realPlayer);

            // Assert
            expect(surveyRepository.updateOne).toHaveBeenCalledWith(
                { playerId: realPlayer.session.playerId },
                { $setOnInsert: survey },
                { upsert: true }
            );
        });
    });
});
