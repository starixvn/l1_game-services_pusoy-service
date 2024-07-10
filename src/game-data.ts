import { TableGameData } from "sc-game-base/src/table";
import { HandResult } from "./models/rounds";
export default class GameData extends TableGameData {
    declare ingame: InGameData;
}

export type InGamePlayerData = {
    name: string;
    currency: string;
    system: string;
    betTracks: any;
    betQueue: any;
    operatorId: string;
    betProcessing: boolean;
    ownBets: any;
    roundId: number;
    realPlayerSubmitted: boolean;
    remainingTime: number;
    result: { [name: string]: HandResult };
    outTable: boolean;
    otherPlayers: BotData[];
    playerId: string;
    userId: string;
    numberOfSubmittedHands: number;
};

export type InGameData = {
    [name: string]: InGamePlayerData;
};

export type BotData = {
    id: string;
    name: string;
    red: number;
    avatarId: number;
    arrangeTime?: number;
};
