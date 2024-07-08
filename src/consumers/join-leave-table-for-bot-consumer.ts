import GameData from "../game-data";

export default class JoinLeaveTableForBotConsumer {
    gameData: GameData;

    constructor(gameData: GameData) {
        this.gameData = gameData;
    }

    joinTableForBot(botId: string, playerGame: string) {
        this.gameData.ingame[playerGame].otherPlayers.push(botId);
    }

    leaveTableForBot(botId: string, playerGame: string) {
        this.gameData.ingame[playerGame].otherPlayers = this.gameData.ingame[playerGame].otherPlayers.filter((x) => x !== botId);
    }
}
