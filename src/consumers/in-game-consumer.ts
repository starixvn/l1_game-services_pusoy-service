import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData from "../game-data";
import { RealPlayer } from "../type/real-player";

export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    async consume(realPlayer: RealPlayer) {
        const { gameConfigs } = this.gameData;
        const disabled = !gameConfigs || !gameConfigs.enabled;

        // TODO: check
        if (disabled && false) {
            realPlayer.socketClient.emit(this.definition.name, { um: disabled, um_message: this.gameData.umMessages });
        } else {
            this.initTable(realPlayer);
        }

        const payload = await this.buildPayload(realPlayer);

        this.publisher.publishToUser(realPlayer.UID, payload);
    }

    async buildPayload(realPlayer: RealPlayer) {
        const user = await this.getUserInfo(realPlayer);
        const { exchangeRates } = this.gameData as GameData;
        const { session } = realPlayer;
        const rate = exchangeRates.code[session.currencyCode] * session.multiplier;
        const configs = this.getGameConfigs(session.currencyGroupId);
        return {
            roundData: this.getCurrentRoundData(realPlayer),
            gameConfigs: configs,
            user: { ...user, rate },
        };
    }

    getGameConfigs(currencyGroupId: string) {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === currencyGroupId);

        return { ...settings };
    }

    getCurrentRoundData(realPlayer: RealPlayer) {
        const playerName = realPlayer.profile.name;
        const roundData = this.gameData.ingame[playerName];

        return {
            remainingTime: roundData.remainingTime,
            roundId: roundData.roundId,
            hand: roundData.result[realPlayer.session.playerId],
        };
    }

    initTable(realPlayer: RealPlayer) {
        const tableData = this.gameData.ingame[realPlayer.profile.name];
        tableData.userId = realPlayer.UID;
        tableData.playerId = realPlayer.session.playerId;
    }
}
