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
    submitted: boolean;
    isRoundEnded: boolean;
    remainingTime: number;
    result: HandResult[];
    outTable: boolean;
    arrangeTime: number[];
    otherPlayers: string[];
};

export type InGameData = {
    [name: string]: InGamePlayerData;
};
