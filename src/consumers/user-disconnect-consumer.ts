import GameData from "../game-data";
import { Core } from "sc-game-base";

export default class UserDisconnectConsumer extends Core.BaseEventConsumers.UserDisconnectConsumer {
    declare gameData: GameData;

    constructor(gameData: GameData) {
        super(gameData);
        this.gameData = gameData;
    }

    consume(socketClient: any) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];
        const tableData = this.gameData.ingame[realPlayer.profile.name];

        if (realPlayer) {
            tableData.isActive = false;
            tableData.userId = "";
            super.consume(socketClient);
        }
    }
}
