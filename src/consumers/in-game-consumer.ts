import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData, { BotInRound, RealPlayer, TableInGame } from "../game-data";
import GameDefinition from "../game-definition";
export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    declare definition: GameDefinition;

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
        const { exchangeRates } = this.gameData;
        const { session } = realPlayer;
        const rate = exchangeRates.code[session.currencyCode] * session.multiplier;
        const configs = this.getGameConfigs(session.currencyGroupId);
        const roundData = this.getCurrentRoundData(realPlayer);
        const playerName = realPlayer.profile.name;
        const tableData = this.gameData.ingame[playerName];

        return {
            remainingTime: tableData.roundData ? roundData.remainingTime : this.definition.durations.timeline.transition,
            gameConfigs: configs,
            pusoyRound: roundData.playerHand ? roundData : {},
            user: { ...user, rate },
        };
    }

    getGameConfigs(currencyGroupId: string) {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === currencyGroupId);
        const gameSettings = { durations: this.definition.durations, suitesMapper: this.definition.suitesMapper };

        return { ...settings, ...gameSettings };
    }

    getCurrentRoundData(realPlayer: RealPlayer) {
        const playerName = realPlayer.profile.name;
        const tableData = this.gameData.ingame[playerName];
        const currentRound = tableData.roundData;
        const invalidRemainingTime = -1;
        let remainingTime = currentRound?.remainingTime;

        if (currentRound && currentRound.remainingTime < 0) {
            remainingTime = this.definition.durations.timeline.transition - currentRound.remainingTime;
        }

        return {
            otherPlayers: currentRound?.otherPlayers,
            submittedPlayers: currentRound?.submittedPlayers,
            remainingTime: currentRound ? remainingTime : invalidRemainingTime,
            roundId: currentRound?.roundId,
            playerHand: currentRound?.result[realPlayer.session.playerId],
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
