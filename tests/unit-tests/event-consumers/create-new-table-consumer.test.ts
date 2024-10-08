import { Core } from "sc-game-base";
import { CreateNewTableConsumer, InGameConsumer } from "../../../src/consumers";
import GameData, { RealPlayer } from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";

describe("CreateNewTableConsumer", () => {
    let createNewTableConsumer: CreateNewTableConsumer;
    let mockInGameConsumer: InGameConsumer;
    let mockGameData: GameData;
    let mockPublisher: Core.BaseEventPublishers.BaseEventPublisher;
    let mockDefinition: GameDefinition;
    let mockRealPlayer: RealPlayer;

    beforeEach(() => {
        mockInGameConsumer = {
            createNewTable: jest.fn(),
            buildPayload: jest.fn().mockResolvedValue({ payloadData: "mockedPayload" }),
        } as unknown as InGameConsumer;

        mockPublisher = {
            publishToUser: jest.fn(),
        } as unknown as Core.BaseEventPublishers.BaseEventPublisher;

        mockGameData = {
            ingame: {},
        } as unknown as GameData;

        mockDefinition = {} as GameDefinition;

        createNewTableConsumer = new CreateNewTableConsumer(mockInGameConsumer, mockGameData, mockPublisher, mockDefinition);

        mockRealPlayer = {
            UID: "playerUID",
            profile: { name: "playerName" },
            session: { playerId: "playerID" },
        } as RealPlayer;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should create a new table and publish the payload if the player is an observer", async () => {
        // Arrange: Set up the mock gameData with an observer roundData
        mockGameData.ingame["playerName"] = {
            roundData: {
                observer: true,
            },
        } as any;

        const mockNewTable = { newTableData: "mockTable" };
        (mockInGameConsumer.createNewTable as jest.Mock).mockReturnValue(mockNewTable);

        // Act: Call the consume method
        await createNewTableConsumer.consume(mockRealPlayer);

        // Assert: Check if the new table was created and added to gameData
        expect(mockInGameConsumer.createNewTable).toHaveBeenCalledWith(mockRealPlayer);
        expect(mockGameData.ingame["playerName"]).toEqual(mockNewTable);

        // Assert: Check if publishToUser was called with an empty otherPlayers array
        expect(mockPublisher.publishToUser).toHaveBeenCalledWith("playerUID", { otherPlayers: [] });

        // Assert: Check if buildPayload was called and the resulting payload was published
        expect(mockInGameConsumer.buildPayload).toHaveBeenCalledWith(mockRealPlayer);
        expect(mockPublisher.publishToUser).toHaveBeenCalledWith("playerUID", { payloadData: "mockedPayload" });
    });

    it("should do nothing if the player is not an observer", async () => {
        // Arrange: Set up the mock gameData with a non-observer roundData
        mockGameData.ingame["playerName"] = {
            roundData: {
                observer: false,
            },
        } as any;

        // Act: Call the consume method
        await createNewTableConsumer.consume(mockRealPlayer);

        // Assert: Check that createNewTable, buildPayload, and publishToUser are not called
        expect(mockInGameConsumer.createNewTable).not.toHaveBeenCalled();
        expect(mockInGameConsumer.buildPayload).not.toHaveBeenCalled();
        expect(mockPublisher.publishToUser).not.toHaveBeenCalled();
    });

    it("should not fail if there is no existing roundData", async () => {
        // Arrange: Set up the mock gameData with no roundData for the player
        mockGameData.ingame["playerName"] = {} as any;

        // Act: Call the consume method
        await createNewTableConsumer.consume(mockRealPlayer);

        // Assert: Check that createNewTable, buildPayload, and publishToUser are not called
        expect(mockInGameConsumer.createNewTable).not.toHaveBeenCalled();
        expect(mockInGameConsumer.buildPayload).not.toHaveBeenCalled();
        expect(mockPublisher.publishToUser).not.toHaveBeenCalled();
    });
});
