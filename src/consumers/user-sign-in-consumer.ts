import { BaseEventConsumers, BaseEventPublishers } from "sc-game-base/src/core";
import GameDefinition from "../game-definition";
import GameData from "../game-data";
import { PlayGamePermissionValidator } from "sc-game-base/src/core/validators";
import GameManagementApiClientFactory, { getOrDefault } from "sc-game-base/src/core/game-management-api";
import { Socket } from "socket.io";
import { signInGame } from "sc-game-base/src/core/helpers/user-service-helpers";

export default class UserSignInConsumer extends BaseEventConsumers.UserSignInConsumer {
    definition: GameDefinition;
    declare gameData: GameData;

    constructor(
        definition: GameDefinition,
        gameData: GameData,
        userSignInPublisher: BaseEventPublishers.UserSignInPublisher,
        playGamePermissionValidator: PlayGamePermissionValidator,
        appConfigs: any,
        gameManagementApiClientFactory: GameManagementApiClientFactory
    ) {
        super(gameData, userSignInPublisher, playGamePermissionValidator, appConfigs, gameManagementApiClientFactory);

        this.definition = definition;
    }

    async consume(socketClient: Socket, payload: any) {
        console.log(`signin payload: `);
        console.log(payload);

        if (!payload) {
            this.handleUnauthorizedSignIn(socketClient);

            return;
        }

        const params = {
            session: payload.ss,
            username: payload.username,
            browserUserAgent: socketClient.request.headers["user-agent"],
        };

        const signInGameResult = await signInGame(this.appConfigs.userServiceSettings.url, params);

        console.log(`signInGameResult: `);
        console.log(signInGameResult);

        const userSession = {
            ...signInGameResult,
            userId: signInGameResult.id,
            playerName: signInGameResult.memberName,
        };

        const userInfo = await getOrDefault(this.gameManagementApiClient.users.getUserInfo(userSession.userId), null);

        console.log(`userInfo: `);
        console.log(userInfo);

        if (!userInfo) {
            this.handleUnauthorizedSignIn(socketClient);

            return;
        }

        await this.getUserBetLimit(userSession, userInfo, socketClient);

        Object.values(this.gameData.realPlayers).forEach((realPlayer) => {
            if (realPlayer.UID === userSession.userId && realPlayer.socketClient) {
                realPlayer.socketClient.disconnect(true);
                delete this.gameData.realPlayers[realPlayer.socketClient.id];
            }
        });

        this.handleSignInSuccess(socketClient, userInfo, userSession);
    }
}
