import { BaseEventPublishers } from "sc-game-base/src/core";
import { HandResult, Settlement } from "../models/rounds";
import { BotInRound } from "../game-data";

export type RoundResultPublishInfo = {
    socketId: string;
    roundId: number;
    settlementResult: Record<string, Settlement>;
    result: { [playerId: string]: HandResult };
};

export type DealtRoundInfo = {
    socketId: string;
    playerHand: any;
    roundId: number;
    othersPlayers: BotInRound[];
};

export default class RoundResultPublisher extends BaseEventPublishers.RoundResultPublisher {
    publishRoundResult(info: RoundResultPublishInfo) {
        const finish = {
            roundId: info.roundId,
            settlementResult: info.settlementResult,
            result: info.result,
        };

        this.publishToUser(info.socketId, finish);
    }

    publishPusoyRound(info: any) {
        const pusoyRound = {
            roundId: info.roundId,
            playerHand: info.playerHand,
            othersPlayers: info.othersPlayers,
        };

        this.publishToUser(info.socketId, pusoyRound);
    }
}
