import { GameDefinition as BaseGameDefinition } from "sc-game-base/src/core";
import { Duration as BaseDuration } from "sc-game-base/src/core/game-definition";
export default class GameDefinition extends BaseGameDefinition {
    declare durations: Duration;
    suitesMapper: any;
    constructor(gameSettings: GameSettings, generateResult: Function, settle: Function, generateRawResultForHash: Function) {
        super(gameSettings, generateResult, settle, generateRawResultForHash);
        this.suitesMapper = gameSettings.suitesMapper;
    }
}

export type GameSettings = {
    id: number;
    name: string;
    durations: Duration;
    provablyFair?: boolean;
    suitesMapper: { [key: string]: number };
};

export type Duration = BaseDuration & {
    timeline: {
        transition: number;
        deal: number;
        arrangement: number;
        animation: number;
    };
    animation: {
        normal: number;
        crack: number;
        natural: number;
        compareHands: number;
        pusoy: {
            mini: number;
            full: number;
        };
    };
};
