import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData, { BotInRound, RealPlayer, TableInGame } from "../game-data";

export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    async consume(realPlayer: RealPlayer) {
        const { gameConfigs } = this.gameData;
        const disabled = !gameConfigs || !gameConfigs.enabled;

        if (disabled) {
            realPlayer.socketClient.emit(this.definition.name, { um: disabled, um_message: this.gameData.umMessages });
        } else {
            this.initOrUpdateTable(realPlayer);
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
        const roundData = this.getCurrentRoundData(realPlayer);

        return {
            roundData: roundData.hand ? roundData : {},
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
        const tableData = this.gameData.ingame[playerName];

        return {
            submittedPlayers: tableData.roundData?.submittedPlayers,
            remainingTime: tableData.roundData?.remainingTime,
            roundId: tableData.roundData?.roundId,
            hand: tableData.roundData?.result[realPlayer.session.playerId],
        };
    }

    initOrUpdateTable(realPlayer: RealPlayer) {
        const tableData = this.gameData.ingame[realPlayer.profile.name];
        const newTable = {
            canDestroy: false,
            socketId: realPlayer.UID,
            playerId: realPlayer.session.playerId,
            name: realPlayer.profile.name,
            currency: realPlayer.session.currencyName,
            system: realPlayer.session.system,
            betQueue: [],
            operatorId: realPlayer.session.operatorId,
            botsInTable: [] as BotInRound[],
        } as TableInGame;

        if (tableData?.roundData && tableData.roundData.remainingTime > 0) {
            tableData.socketId = realPlayer.UID;
            tableData.playerId = realPlayer.session.playerId;
            tableData.canDestroy = false;
        } else {
            this.gameData.ingame[realPlayer.profile.name] = newTable;
        }
    }
}
