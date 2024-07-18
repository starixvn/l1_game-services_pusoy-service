import { GameDefinition as BaseGameDefinition } from "sc-game-base/src/core";
export default class GameDefinition extends BaseGameDefinition {}

export type GameSettings = {
    id: number;
    name: string;
    durations: Duration;
    choices: any[];
    choicesMapper: any;
    hedgeBetGroups: any[];
    numberOfTurnsPerRound: number;
    numberOfRoundHistory?: number;
    historyPageSize?: number;
    provablyFair?: boolean;
    botSettings?: any;
};

export type Duration = {
    wholeRound: number;
    placingBets: number;
    lockingBet: number;
    showingResult: number;
    startingRound: number;
    settleAnimation: {
        crack: number;
        natural: number;
        compareHands: number;
        pusoy: {
            mini: number;
            full: number;
        };
    };
};
