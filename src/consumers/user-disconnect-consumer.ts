import GameData from "../game-data";
import { Core } from "sc-game-base";

export default class UserDisconnectConsumer extends Core.BaseEventConsumers.UserDisconnectConsumer {
    declare gameData: GameData;

    consume(socketClient: any) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];

        if (realPlayer) {
            this.gameData.ingame[realPlayer.name].outTable = true;
            delete this.gameData.players[realPlayer.UID];
        }

        super.consume(socketClient);
    }
}
