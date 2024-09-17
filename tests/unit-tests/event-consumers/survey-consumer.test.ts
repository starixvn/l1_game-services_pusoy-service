import SurveyConsumer, { SurveyPayload } from "../../../src/consumers/survey-consumer";
import GameData, { RealPlayer } from "../../../src/game-data";
import { Core } from "sc-game-base";

describe("SurveyConsumer", () => {
    let gameData: GameData;
    let surveyRepository: any;
    let publisher: Core.BaseEventPublishers.BaseEventPublisher;
    let surveyConsumer: SurveyConsumer;

    beforeEach(() => {
        gameData = {
            realPlayers: {},
        } as GameData;

        surveyRepository = jest.fn().mockImplementation((data) => {
            return { toObject: () => data };
        });

        (surveyRepository.updateOne = jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({}),
        })),
            (publisher = {
                publishToUser: jest.fn(),
            } as unknown as Core.BaseEventPublishers.BaseEventPublisher);

        surveyConsumer = new SurveyConsumer(gameData, surveyRepository, publisher);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("consume", () => {
        it("should call updateSurvey if realPlayer exists", async () => {
            const socketClient = { id: "socket1" };
            const payload: SurveyPayload = { wishToPlayWithRealMoney: true };
            const realPlayer = {
                session: { playerId: "player1" },
                profile: { name: "Player One" },
                UID: "UID1",
            } as RealPlayer;

            gameData.realPlayers[socketClient.id] = realPlayer;

            const updateSurveySpy = jest.spyOn(surveyConsumer, "updateSurvey").mockImplementation(jest.fn());

            await surveyConsumer.consume(socketClient, payload);

            expect(updateSurveySpy).toHaveBeenCalledWith(realPlayer, payload);
        });

        it("should not call updateSurvey if realPlayer does not exist", async () => {
            const socketClient = { id: "socket1" };
            const payload: SurveyPayload = { wishToPlayWithRealMoney: true };

            const updateSurveySpy = jest.spyOn(surveyConsumer, "updateSurvey").mockImplementation(jest.fn());

            await surveyConsumer.consume(socketClient, payload);

            expect(updateSurveySpy).not.toHaveBeenCalled();
        });
    });

    describe("updateSurvey", () => {
        it("should update survey and publish event", async () => {
            const realPlayer = {
                session: { playerId: "player1" },
                profile: { name: "Player One" },
                UID: "UID1",
            } as RealPlayer;
            const payload: SurveyPayload = { wishToPlayWithRealMoney: true };

            await surveyConsumer.updateSurvey(realPlayer, payload);

            const filter = { playerId: realPlayer.session.playerId };
            const surveyData = {
                playerId: realPlayer.session.playerId,
                playerName: realPlayer.profile.name,
                wishToPlayWithRealMoney: payload.wishToPlayWithRealMoney,
            };

            expect(surveyRepository.updateOne).toHaveBeenCalledWith(filter, surveyData, { upsert: true });
            expect(publisher.publishToUser).toHaveBeenCalledWith(realPlayer.UID, { surveyUpdated: true });
        });
    });
});
