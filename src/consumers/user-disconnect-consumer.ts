import Bot from "../crons/bot";
import GameData, { TableInGame } from "../game-data";
import { Core } from "sc-game-base";

export default class UserDisconnectConsumer extends Core.BaseEventConsumers.UserDisconnectConsumer {
    declare gameData: GameData;
    bot: Bot;

    constructor(gameData: GameData, bot: Bot) {
        super(gameData);
        this.gameData = gameData;
        this.bot = bot;
    }

    async consume(socketClient: any) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];

        if (realPlayer) {
            const tableData = this.gameData.ingame[realPlayer.profile.name];

            this.updateOrDeleteTable(tableData);
            super.consume(socketClient);
        }
    }

    async updateOrDeleteTable(tableData: TableInGame) {
        if (tableData) {
            if (!tableData.roundData) {
                await this.bot.removeBotsFromTable(tableData);
                delete this.gameData.ingame[tableData.name];
            } else {
                tableData.canDestroy = true;
                tableData.socketId = "";
            }
        }
    }
}
