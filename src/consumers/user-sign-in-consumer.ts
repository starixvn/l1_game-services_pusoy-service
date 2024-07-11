import GameDefinition from "../game-definition";
import GameData from "../game-data";
import { getOrDefault } from "sc-game-base/src/core/game-management-api";
import { Socket } from "socket.io";
import { signInGame } from "sc-game-base/src/core/helpers/user-service-helpers";
import { TableUserSignInConsumer } from "sc-game-base/src/table/event-consumers";

export default class UserSignInConsumer extends TableUserSignInConsumer {
    declare definition: GameDefinition;
    declare gameData: GameData;

    async consume(socketClient: Socket, payload: any) {
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

        const userSession = {
            ...signInGameResult,
            userId: signInGameResult.id,
            playerName: signInGameResult.memberName,
        };

        const userInfo = await getOrDefault(this.gameManagementApiClient.users.getUserInfo(userSession.userId), null);

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
