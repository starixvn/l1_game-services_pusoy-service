import GameData, { TableInGame } from "../game-data";
import { Core } from "sc-game-base";

export default class UserDisconnectConsumer extends Core.BaseEventConsumers.UserDisconnectConsumer {
    declare gameData: GameData;

    constructor(gameData: GameData) {
        super(gameData);
        this.gameData = gameData;
    }

    consume(socketClient: any) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];

        if (realPlayer) {
            const tableData = this.gameData.ingame[realPlayer.profile.name];

            this.updateOrDeleteTable(tableData);
            super.consume(socketClient);
        }
    }

    updateOrDeleteTable(tableData: TableInGame) {
        if (tableData) {
            if (!tableData.roundData) {
                delete this.gameData.ingame[tableData.name];
            } else {
                tableData.canDestroy = true;
                tableData.socketId = "";
            }
        }
    }
}
