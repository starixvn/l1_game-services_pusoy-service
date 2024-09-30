import { BaseEventPublisher } from "sc-game-base/src/core/event-publishers";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import scoreConfig from "../score-config";

export default class GameStatusPublisher extends BaseEventPublisher {
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
        const { remainingTime, roundId } = this.gameData;

        const realPlayers = Object.values(this.gameData.realPlayers);

        realPlayers.forEach((realPlayer) => {
            const { session } = realPlayer;
            const configs = this.getGameConfigs(session.currencyGroupId);

            const payload = { gameConfigs: configs };
            realPlayer.socketClient && realPlayer.socketClient.emit(this.gameName, payload);
        });

        this.publishToAllAdmins({
            remainingTime,
            roundId,
            currencies: this.gameData.currencies,
            exchangeRates: this.gameData.exchangeRates,
        });
    }
}
