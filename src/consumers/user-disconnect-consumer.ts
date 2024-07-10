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

        if (realPlayer) {
            this.gameData.ingame[realPlayer.profile.name].outTable = true;
            delete this.gameData.players[socketClient.id];
        }

        super.consume(socketClient);
    }
}
