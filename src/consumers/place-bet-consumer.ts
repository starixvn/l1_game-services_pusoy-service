import { BaseEventConsumers } from "sc-game-base/src/core";
import GameData, { InGamePlayerData } from "../game-data";
import GameDefinition from "../game-definition";
import { RealPlayer } from "../type/real-player";

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
        const isPlaying = tableData?.isRoundEnded ?? false;

        if (!this.gameData.disabled && !isPlaying) {
            const betAmount = payload.amount ? 0 : payload.amount * this.gameData.gameConfigs.maxbet;

            Object.assign(payload, {
                amount: betAmount,
                mode: payload.m ?? this.DisplayMode.Landscape,
                receivedTime: new Date(),
            });

            if (!tableData) {
                const newPlayer = {
                    name: playerName,
                    currency: realPlayer.session.currencyName,
                    system: realPlayer.session.system,
                    betTracks: {},
                    betQueue: [],
                    operatorId: realPlayer.session.operatorId,
                };

                this.gameData.ingame[playerName] = newPlayer as InGamePlayerData;
            }

            this.gameData.ingame[playerName].betQueue.push({ player: realPlayer, payload });
        } else {
            this.publisher.publishToUser(realPlayer.UID, {
                um: this.gameData.disabled,
                um_message: this.gameData.umMessages,
                isPlaying,
            });
        }
    }
}
