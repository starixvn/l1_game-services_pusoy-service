import { BaseSocketRouter } from "sc-game-base/src/core/routers";
import GameData from "../game-data";
import GameDefinition from "../game-definition";

export default class SocketRouter extends BaseSocketRouter {
    declare gameData: GameData;
    declare definition: GameDefinition;

    verify(payload?: any) {
        const realPlayer = this.gameData.realPlayers[this.socketClient.id];

        if (!realPlayer) {
            this.userSignInPublisher.publishUnauthorizedMessage(this.socketClient);
            this.socketClient.disconnect(true);

            this.logService.setTag({ id: "socket-io-id", value: this.socketClient.id });
            this.logService.setTag({ id: "username", value: payload?.username });
            this.logService.logError("User not found in server storage");
            this.logService.setTag({ id: "socket-io-id", value: "" });
            this.logService.setTag({ id: "username", value: "" });
            return false;
        }

        return true;
    }
}
