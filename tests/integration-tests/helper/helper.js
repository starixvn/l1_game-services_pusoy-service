import { currencyData } from "../_stubs/test-data";
import { GameClientDriver, normalUser, eventTypes } from "sc-game-service-integration-utils";
import gameSettings from "../_stubs/game-settings";

export const checkConnect = (socketOptions, callback) => {
    const normalUserClientDriver = new GameClientDriver(socketOptions, initUserSession(normalUser));
    normalUserClientDriver.on(eventTypes.connectError, () => {
        setTimeout(() => {
            checkConnect(socketOptions, callback);
        }, 1000);
    });
    normalUserClientDriver.on(eventTypes.connect, () => {
        normalUserClientDriver.close();
        setTimeout(callback, 2000);
    });
};

export const getTimeOutToPlacingBetTime = (remainingTime, durations) => {
    let timeout = 0;
    if (remainingTime <= durations.lockingBet) {
        timeout = remainingTime + durations.wholeTurn - durations.placingBets + gameSettings.startingRound + 1;
    } else if (remainingTime >= durations.placingBets) {
        timeout = remainingTime - durations.placingBets + 1;
    }

    return timeout;
};

export const getTimeOutToSettleTime = (remainingTime, durations) => {
    let timeout = 0;
    if (remainingTime <= durations.placingBets) {
        timeout = remainingTime + 1 + gameSettings.startingRound;
    }

    return timeout;
};

export const getTimeOutToBetInvalid = (remainingTime, durations) => {
    let timeout = 0;
    if (remainingTime >= durations.lockingBet && remainingTime <= durations.placingBets) {
        timeout = remainingTime - durations.lockingBet + 1;
    }

    return timeout;
};

export const initUserSession = (user) => {
    return {
        session: `${user.playerId}-session-id`,
        ss: `${user.playerId}-session-id`,
        currency: currencyData.name,
        username: `${user.playerId}_${user.playerName}`,
        browserUserAgent: "browser-user-agent",
    };
};
