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
    betTracks: { [name: string]: RoundData };
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
    numberOfBots: number;
    canBotLeave: boolean;
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

export type RoundData = {
    id: number;
    result: { [name: string]: HandResult };
    otherPlayers: BotData[];
    numberOfSubmittedHands: number;
    realPlayerSubmitted: boolean;
};
