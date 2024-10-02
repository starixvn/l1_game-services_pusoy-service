import { TableGameData } from "sc-game-base/src/table";
import { HandResult } from "./models/rounds";
export default class GameData extends TableGameData {
    declare ingame: InGameData;
    declare realPlayers: { [playerId: string]: RealPlayer };
}

export type RealPlayer = {
    UID: string;
    profile: { name: string; minBet: number; maxBet: number };
    session: any;
    socketClient: any;
};

export type TableInGame = {
    name: string;
    currency: string;
    system: string;
    roundData?: RoundOfTable;
    betQueue: any;
    operatorId: string;
    betProcessing: boolean;
    canDestroy: boolean;
    canAddBot: boolean;
    playerId: string;
    socketId: string;
    botsInTable: BotInRound[];
    freeBotSlots: number[];
    balance: number;
    searchingPlayersTime: number;
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
    slot: number;
    balance: number;
};

export type RoundOfTable = {
    roundId: number;
    remainingTime: number;
    showingResultTime: number;
    result: { [playerId: string]: HandResult };
    otherPlayers: BotInRound[];
    submittedPlayers: BotInRound[];
    realPlayerSubmitted: boolean;
    isSettled: boolean;
    observer?: boolean;
};
