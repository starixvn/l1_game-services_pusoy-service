import { BaseEventPublishers } from "sc-game-base/src/core";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import scoreConfig from "../score-config";

export default class GameStatusPublisher extends BaseEventPublishers.GameStatusPublisher {
    declare gameData: GameData;
    definition: GameDefinition;

    constructor(gameName: string, gameData: GameData, definition: GameDefinition) {
        super(gameName, gameData);

        this.definition = definition;
    }

    getGameConfigs(currencyGroupId: string) {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === currencyGroupId);
        const gameSettings = { durations: this.definition.durations, suitesMapper: this.definition.suitesMapper, scoreConfig: scoreConfig };

        return { ...settings, ...gameSettings };
    }

    publishEnablingGameStatus() {
        const { roundId } = this.gameData;

        const realPlayers = Object.values(this.gameData.realPlayers);

        realPlayers.forEach((realPlayer) => {
            const playerName = realPlayer.profile.name;
            const tableData = this.gameData.ingame[playerName];
            const remainingTime = tableData?.roundData ? tableData.roundData.remainingTime : this.definition.durations.timeline.transition;

            const { session } = realPlayer;
            const configs = this.getGameConfigs(session.currencyGroupId);

            const payload = { gameConfigs: configs, remainingTime: remainingTime };
            realPlayer.socketClient && realPlayer.socketClient.emit(this.gameName, payload);
        });

        this.publishToAllAdmins({
            remainingTime: this.gameData.remainingTime,
            roundId,
            currencies: this.gameData.currencies,
            exchangeRates: this.gameData.exchangeRates,
        });
    }
}
