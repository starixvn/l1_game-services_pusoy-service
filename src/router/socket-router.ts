import { BaseSocketRouter } from "sc-game-base/src/core/routers";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import { InGameConsumer, PlaceBetConsumer, UserDisconnectConsumer, UserSignInConsumer } from "sc-game-base/src/core/event-consumers";
import { UserSignInPublisher } from "sc-game-base/src/core/event-publishers";
import { logger } from "sc-common";
import { PlayGamePermissionValidator } from "sc-game-base/src/core/validators";
import { HistoryQuery, RoundQuery } from "sc-game-base/src/core/query-apis";
import { SubmitArrangementConsumer, SurveyConsumer } from "../consumers";
import { RearrangePayload, SubmitPayload } from "../consumers/submit-arrangement-consumer";
import { SurveyPayload } from "../consumers/survey-consumer";

export default class SocketRouter extends BaseSocketRouter {
    declare gameData: GameData;
    declare definition: GameDefinition;

    submitArrangementConsumer: SubmitArrangementConsumer;
    surveyConsumer: SurveyConsumer;

    constructor({
        definition,
        gameData,
        userSignInConsumer,
        inGameConsumer,
        placeBetConsumer,
        userDisconnectConsumer,
        userSignInPublisher,
        historyQuery,
        logService,
        playGamePermissionValidator,
        roundQuery,
        submitArrangementConsumer,
        surveyConsumer,
    }: {
        definition: GameDefinition;
        gameData: GameData;
        userSignInConsumer: UserSignInConsumer;
        inGameConsumer: InGameConsumer;
        placeBetConsumer: PlaceBetConsumer;
        userDisconnectConsumer: UserDisconnectConsumer;
        userSignInPublisher: UserSignInPublisher;
        historyQuery: HistoryQuery;
        logService: typeof logger;
        playGamePermissionValidator: PlayGamePermissionValidator;
        roundQuery: RoundQuery;
        submitArrangementConsumer: SubmitArrangementConsumer;
        surveyConsumer: SurveyConsumer;
    }) {
        super({
            definition,
            gameData,
            userSignInConsumer,
            inGameConsumer,
            placeBetConsumer,
            userDisconnectConsumer,
            userSignInPublisher,
            historyQuery,
            logService,
            playGamePermissionValidator,
            roundQuery,
        });

        this.submitArrangementConsumer = submitArrangementConsumer;
        this.surveyConsumer = surveyConsumer;
    }

    init(socketClient: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): void {
        super.init(socketClient);
        this.socketClient.on("submitArrangement", this.handleSubmitArrangement.bind(this));
        this.socketClient.on("rearrange", this.handleSubmitRearrange.bind(this));
        this.socketClient.on("survey", this.surveyConsumer.consume.bind(this));
    }

    handleSubmitArrangement(payload: SubmitPayload) {
        try {
            if (!this.verify()) {
                return;
            }

            this.submitArrangementConsumer.consume(payload);
        } catch (error) {
            this.logService.logError(error);
        }
    }

    handleSubmitRearrange(payload: RearrangePayload) {
        try {
            if (!this.verify()) {
                return;
            }

            this.submitArrangementConsumer.consumeRearrangeCards(payload);
        } catch (error) {
            this.logService.logError(error);
        }
    }

    handleUpdateSurvey(payload: SurveyPayload) {
        try {
            if (!this.verify()) {
                return;
            }

            this.surveyConsumer.consume(this.socketClient, payload);
        } catch (error) {
            this.logService.logError(error);
        }
    }
}
