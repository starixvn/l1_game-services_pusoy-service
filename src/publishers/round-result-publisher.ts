import { BaseEventPublishers } from "sc-game-base/src/core";
import { HandResult, Settlement } from "../models/rounds";
import { BotInRound } from "../game-data";

export type RoundResultPublishInfo = {
    socketId: string;
    roundId: number;
    settlementResult: Record<string, Settlement>;
    settleEffectDuration: Record<string, number>;
    result: { [playerId: string]: HandResult };
};

export type DealtRoundInfo = {
    socketId: string;
    playerHand: any;
    roundId: number;
    otherPlayers: BotInRound[];
};

export default class RoundResultPublisher extends BaseEventPublishers.RoundResultPublisher {
    publishRoundResult(info: RoundResultPublishInfo) {
        const finish = {
            roundId: info.roundId,
            settlementResult: info.settlementResult,
            result: info.result,
            settleEffectDuration: info.settleEffectDuration,
        };

        this.publishToUser(info.socketId, { finish });
    }

    publishPusoyRound(info: DealtRoundInfo) {
        const pusoyRound = {
            roundId: info.roundId,
            playerHand: info.playerHand,
            otherPlayers: info.otherPlayers,
        };

        this.publishToUser(info.socketId, { pusoyRound });
    }
}
