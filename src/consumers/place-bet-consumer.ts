import { BaseEventConsumers } from "sc-game-base/src/core";
import GameData, { RealPlayer } from "../game-data";
import GameDefinition from "../game-definition";

export type BetPayload = {
    roundId: number;
    amount: number;
    m: any;
    receivedTime: Date;
    mode: any;
    clientSentTime: Date;
    time: Date;
};

export default class PlaceBetConsumer extends BaseEventConsumers.PlaceBetConsumer {
    declare gameData: GameData;
    declare definition: GameDefinition;

    consume(realPlayer: RealPlayer, payload: BetPayload): void {
        const playerName = realPlayer.profile.name;
        const tableData = this.gameData.ingame[playerName];

        if (!this.gameData.disabled && !tableData.canDestroy && !tableData.roundData) {
            const betAmount = payload.amount ? payload.amount * this.gameData.gameConfigs.maxbet : 0;
            Object.assign(payload, {
                amount: betAmount,
                mode: payload.m ?? this.DisplayMode.Landscape,
                receivedTime: new Date(),
            });

            tableData.betQueue.push({ player: realPlayer, payload });
        } else {
            this.publisher.publishToUser(realPlayer.UID, {
                um: this.gameData.disabled,
                endBet: -1,
                um_message: this.gameData.umMessages,
                isPlaying: tableData.roundData ? true : false,
                isActive: !tableData.canDestroy,
            });
        }
    }
}
