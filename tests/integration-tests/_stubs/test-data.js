import gameSetting from "./game-settings";

const game = {
    id: gameSetting.id,
    name: gameSetting.name,
};

const currencyData = { code: "USD", name: "$US" };

const socketOptionsFunc = (port) => {
    return {
        socketUri: `http://localhost:${port}/user/${gameSetting.name.toLowerCase()}`,
        gameName: game.name,
        proxyRoute: "/socket.io",
    };
};

const gameConfig = {
    type: 0,
    name: gameSetting.name.toLowerCase(),
    minBet: 1,
    maxBet: 3000,
    maxBetPerChoices: {
        big: 3000,
        small: 3000,
        specific1: 3000,
        specific2: 3000,
        specific3: 3000,
        specific4: 3000,
        specific5: 3000,
        specific6: 3000,
    },
    odds: { big: 1.96, small: 1.96, single: 2, double: 3.5, triple: 6 },
    margin: [],
    botenabled: false,
    hour_maxbot: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bot_maxbet: 1000,
    choices_maxbet: {
        big: 3000,
        small: 3000,
        specific1: 3000,
        specific2: 3000,
        specific3: 3000,
        specific4: 3000,
        specific5: 3000,
        specific6: 3000,
    },
};

const pfResults = [];

const roundsData = [];

const userBetData = (uid) => {
    return [];
};

const userBetLogData = (uid) => {
    return [];
};

const promotions = [];

export { game, currencyData, socketOptionsFunc, gameConfig, roundsData, userBetData, promotions, userBetLogData, pfResults };
