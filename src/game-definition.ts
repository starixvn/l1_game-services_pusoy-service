import { GameDefinition as BaseGameDefinition } from "sc-game-base/src/core";
import { Duration as BaseDuration } from "sc-game-base/src/core/game-definition";
export default class GameDefinition extends BaseGameDefinition {
    declare durations: Duration;
    searchingPlayersTime: {
        min: number;
        max: number;
    };
    suitesMapper: { [key: string]: number };
    botSettings: BotSettings;
    constructor(gameSettings: GameSettings, generateResult: Function, settle: Function, generateRawResultForHash: Function) {
        super(gameSettings, generateResult, settle, generateRawResultForHash);
        this.suitesMapper = gameSettings.suitesMapper;
        this.botSettings = gameSettings.botSettings;
        this.searchingPlayersTime = gameSettings.searchingPlayersTime;
    }
}

interface BotRatioConfig {
    numberOfBots: [number, number, number, number];
    rate: [number, number, number, number];
}

interface BotSettings {
    joinConfigs: BotRatioConfig;
    leaveConfigs: BotRatioConfig;
}

export type GameSettings = {
    id: number;
    name: string;
    durations: Duration;
    provablyFair?: boolean;
    suitesMapper: { [key: string]: number };
    botSettings: BotSettings;
    searchingPlayersTime: {
        min: number;
        max: number;
    };
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
        pusoy: {
            mini: number;
            full: number;
        };
        chipFly: number;
    };
};
