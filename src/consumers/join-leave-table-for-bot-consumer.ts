import GameData from "../game-data";
import GameDefinition from "../game-definition";

export default class JoinLeaveTableForBotConsumer {
    gameData: GameData;
    definition: GameDefinition;

    constructor(gameData: GameData, definition: GameDefinition) {
        this.gameData = gameData;
        this.definition = definition;
    }

    joinTableForBot(botId: string, playerName: string) {
        this.gameData.ingame[playerName].otherPlayers.push(botId);
        this.gameData.ingame[playerName].arrangeTime.push(this.definition.durations.wholeRound - this.definition.durations.lockingBet);
    }

    leaveTableForBot(botId: string, playerName: string) {
        const index = this.gameData.ingame[playerName].otherPlayers.indexOf(botId);
        this.gameData.ingame[playerName].otherPlayers = this.gameData.ingame[playerName].otherPlayers.filter((x) => x !== botId);
        this.gameData.ingame[playerName].arrangeTime = this.gameData.ingame[playerName].arrangeTime.filter((_, i) => i !== index);
    }
}
