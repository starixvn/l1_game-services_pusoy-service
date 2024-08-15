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
import { SubmitArrangementConsumer } from "../consumers";
import { ReArrangePayload, SubmitPayload } from "../consumers/submit-arrangement-consumer";

export default class SocketRouter extends BaseSocketRouter {
    declare gameData: GameData;
    declare definition: GameDefinition;

    submitArrangementConsumer: SubmitArrangementConsumer;

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
    }

    init(socketClient: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): void {
        super.init(socketClient);
        this.socketClient.on("submitArrangement", this.handleSubmitArrangement.bind(this));
        this.socketClient.on("reArrange", this.handleSubmitReArrange.bind(this));
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

    handleSubmitReArrange(payload: ReArrangePayload) {
        try {
            if (!this.verify()) {
                return;
            }

            this.submitArrangementConsumer.consumeReArrangeCards(payload);
        } catch (error) {
            this.logService.logError(error);
        }
    }
}
