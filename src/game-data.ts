import { TableGameData } from "sc-game-base/src/table";
import { HandResult } from "./models/rounds";
import { RealPlayer } from "./type/real-player";
export default class GameData extends TableGameData {
    declare ingame: InGameData;
    declare realPlayers: { [playerId: string]: RealPlayer };
}

export type TableInGame = {
    name: string;
    currency: string;
    system: string;
    roundData?: RoundOfTable;
    betQueue: any;
    operatorId: string;
    betProcessing: boolean;
    canDestroy: boolean;
    playerId: string;
    socketId: string;
    botsInTable: BotInRound[];
};

export type InGameData = {
    [name: string]: TableInGame;
};

export type BotInRound = {
    id: string;
    name: string;
    red: number;
    avatarId: number;
    arrangeTime?: number;
};

export type RoundOfTable = {
    roundId: number;
    remainingTime: number;
    result: { [playerId: string]: HandResult };
    otherPlayers: BotInRound[];
    submittedPlayers: BotInRound[];
    realPlayerSubmitted: boolean;
};
