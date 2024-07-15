import { GameDefinition as BaseGameDefinition } from "sc-game-base/src/core";
export default class GameDefinition extends BaseGameDefinition {
    constructor(
        {
            id = 0,
            name = "",
            durations = {
                wholeRound: 55,
                settleEffect: {
                    crack: 2,
                    natural: 2,
                    compareHands: 4,
                    pusoy: {
                        mini: 2,
                        full: 2,
                    },
                },
            },
            choices = [],
            choicesMapper = {},
            hedgeBetGroups = [],
            numberOfRoundHistory = 100,
            historyPageSize = 8,
            provablyFair = true,
            botSettings = {},
        }: GameSettings,
        generateResult: Function,
        settle: Function,
        generateRawResultForHash: Function
    ) {
        super(
            { id, name, durations, choices, choicesMapper, hedgeBetGroups, numberOfRoundHistory, historyPageSize, provablyFair },
            generateResult,
            settle,
            generateRawResultForHash
        );
        this.botSettings = botSettings;
    }
    botSettings: any;
}

export type GameSettings = {
    id: number;
    name: string;
    durations: any;
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
    settleEffect: {
        crack: number;
        natural: number;
        compareHands: number;
        pusoy: {
            mini: number;
            full: number;
        };
    };
};
