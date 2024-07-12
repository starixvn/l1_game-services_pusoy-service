import { TableGameData } from "sc-game-base/src/table";
import { HandResult } from "./models/rounds";
import { RealPlayer } from "./type/real-player";
export default class GameData extends TableGameData {
    declare ingame: InGameData;
    declare realPlayers: { [name: string]: RealPlayer };
}

export type TableInGame = {
    name: string;
    currency: string;
    system: string;
    betTracks: { [name: string]: RoundOfTable };
    betQueue: any;
    operatorId: string;
    betProcessing: boolean;
    ownBets: any;
    roundId: number;
    remainingTime: number;
    isActive: boolean;
    playerId: string;
    userId: string;
    isRoundEnded: boolean;
    canBotLeave: boolean;
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
    id: number;
    result: { [name: string]: HandResult };
    otherPlayers: BotInRound[];
    numberOfSubmittedHands: number;
    realPlayerSubmitted: boolean;
};
