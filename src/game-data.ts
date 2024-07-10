import { TableGameData } from "sc-game-base/src/table";
import { HandResult } from "./models/rounds";
import { RealPlayer } from "./type/real-player";
export default class GameData extends TableGameData {
    declare ingame: InGameData;
    declare realPlayers: { [name: string]: RealPlayer };
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
