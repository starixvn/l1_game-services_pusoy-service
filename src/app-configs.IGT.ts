import appConfigs from "./app-configs";

export default Object.assign(appConfigs, {
    authenticateSettings: {
        url: "https://auth.lumigame.com",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 3000,
        useAuthenticate: false,
        audiences: ["api", "admin-api"],
    },
    sentry: {
        sentryUrl: "https://3711f3082699411a8716a3221ca1fd9e@sentry.lumigame.com/89",
        logIdentifier: "Pusoy-integration-test",
        env: "DEV",
    },
    database: {
        url: "mongodb://0.0.0.0:27017",
        options: {
            dbName: "pusoy-test-db",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    enabledBoostedOdds: false,
    disableCors: true,
});
