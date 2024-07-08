import { BaseEventConsumers } from "sc-game-base/src/core";
import GameData, { InGamePlayerData } from "../game-data";
import GameDefinition from "../game-definition";
import { RealPlayer } from "../type/real-player";

export type BetPayload = {
    stackLevel: number;
    amount: number;
    roundId: number;
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

        const betAmount = payload.stackLevel ? 1000 : payload.stackLevel * this.gameData.gameConfigs.maxbet;

        Object.assign(payload, {
            amount: betAmount,
            roundId: +payload.roundId || this.gameData.ingame[playerName].roundId,
            mode: payload.m ?? this.DisplayMode.Landscape,
            receivedTime: new Date(),
        });

        if (!this.gameData.ingame[playerName]) {
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
    }
}
