import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import SocketRouter from "../../../src/router/socket-router";
import GameData from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import { InGameConsumer, PlaceBetConsumer, UserDisconnectConsumer, UserSignInConsumer } from "sc-game-base/src/core/event-consumers";
import { UserSignInPublisher } from "sc-game-base/src/core/event-publishers";
import { logger } from "sc-common";
import { PlayGamePermissionValidator } from "sc-game-base/src/core/validators";
import { HistoryQuery, RoundQuery } from "sc-game-base/src/core/query-apis";
import { CreateNewTableConsumer, SubmitArrangementConsumer, SurveyConsumer } from "../../../src/consumers";
import { RearrangePayload, SubmitPayload } from "../../../src/consumers/submit-arrangement-consumer";
import { SurveyPayload } from "../../../src/consumers/survey-consumer";

describe("SocketRouter", () => {
    let socketRouter: SocketRouter;
    let mockSocketClient: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    let mockSubmitArrangementConsumer: SubmitArrangementConsumer;
    let mockSurveyConsumer: SurveyConsumer;
    let mockCreateNewTableConsumer: CreateNewTableConsumer;

    beforeEach(() => {
        mockSocketClient = {
            on: jest.fn(),
            id: "",
        } as unknown as Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

        mockSubmitArrangementConsumer = {
            consume: jest.fn(),
            consumeRearrangeCards: jest.fn(),
        } as unknown as SubmitArrangementConsumer;

        mockSurveyConsumer = {
            consume: jest.fn(),
        } as unknown as SurveyConsumer;

        mockCreateNewTableConsumer = {
            consume: jest.fn().mockResolvedValue("mocked response"),
        } as unknown as CreateNewTableConsumer;

        socketRouter = new SocketRouter({
            definition: {} as GameDefinition,
            gameData: {} as GameData,
            userSignInConsumer: {} as UserSignInConsumer,
            inGameConsumer: {} as InGameConsumer,
            placeBetConsumer: {} as PlaceBetConsumer,
            userDisconnectConsumer: {} as UserDisconnectConsumer,
            userSignInPublisher: {} as UserSignInPublisher,
            historyQuery: {} as HistoryQuery,
            logService: logger,
            playGamePermissionValidator: {} as PlayGamePermissionValidator,
            roundQuery: {} as RoundQuery,
            submitArrangementConsumer: mockSubmitArrangementConsumer,
            surveyConsumer: mockSurveyConsumer,
            createNewTableConsumer: mockCreateNewTableConsumer,
        });

        socketRouter.init(mockSocketClient);

        socketRouter.verify = jest.fn().mockReturnValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should initialize socket event listeners", () => {
        expect(mockSocketClient.on).toHaveBeenCalledWith("submitArrangement", expect.any(Function));
        expect(mockSocketClient.on).toHaveBeenCalledWith("rearrange", expect.any(Function));
        expect(mockSocketClient.on).toHaveBeenCalledWith("survey", expect.any(Function));
        expect(mockSocketClient.on).toHaveBeenCalledWith("createNewTable", expect.any(Function));
    });

    it("should handle submitArrangement event", () => {
        const payload: SubmitPayload = {
            playerId: "player1",
            playerName: "Player One",
            roundId: 1,
            submit: true,
            hand: {
                front: [],
                middle: [],
                back: [],
            },
        };

        socketRouter.handleSubmitArrangement(payload);

        expect(mockSubmitArrangementConsumer.consume).toHaveBeenCalledWith(payload);
    });

    it("should handle rearrange event", () => {
        const payload: RearrangePayload = {
            playerId: "player1",
            playerName: "Player One",
        };

        socketRouter.handleSubmitRearrange(payload);

        expect(mockSubmitArrangementConsumer.consumeRearrangeCards).toHaveBeenCalledWith(payload);
    });

    it("should handle survey event", () => {
        const payload: SurveyPayload = {
            wishToPlayWithRealMoney: true,
        };

        socketRouter.handleUpdateSurvey(payload);

        expect(mockSurveyConsumer.consume).toHaveBeenCalledWith(mockSocketClient, payload);
    });

    it("should handle create new table event", async () => {
        // Arrange
        const mockPlayer = {
            UID: "socket123",
            profile: { name: "player1" },
            session: { playerId: "player1" },
        };

        // Mock the gameData to include the player with the corresponding socket ID
        socketRouter.gameData = {
            realPlayers: {
                socket123: mockPlayer,
            },
        } as any;

        (mockSocketClient as any).id = "socket123";

        // Act
        await socketRouter.handleCreateNewTable();

        // Assert
        expect(mockCreateNewTableConsumer.consume).toHaveBeenCalledWith(mockPlayer);
    });
});
