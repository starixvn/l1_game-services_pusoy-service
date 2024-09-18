export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://l2_game_api_local:5000",
        authUrl: "http://l2_auth_api_local:5000",
        client: {
            id: "game-server",
            secret: "gameserver@20luminet&",
        },
        useAuthenticate: true,
        requestTimeout: 10000,
        placeBetTimeout: 2000,
        enabledApiLogs: true,
    },
    socketOptions: {
        pingInterval: 60 * 1000,
        pingTimeout: 60 * 1000,
        transports: ["websocket"],
        allowUpgrades: false,
        perMessageDeflate: false,
        maxRequestsPerInterval: 100, // default 1000
        rateLimitInterval: 10 * 1000, // default 10 * 1000
    },
    enabledLogs: true,
    database: {
        url: "mongodb://lmn_backend:LmnBackend@10.10.50.12:39200,10.10.50.13:39200,10.10.50.14:39200/",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "https://acb36eb835d948d68c1aad9873754d51@sentry.lumigame.com/27",
        logIdentifier: "Pusoy",
        env: "LOCAL",
    },
    authenticateSettings: {
        url: "http://l2_auth_api_local:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://l2_user_service_local:5000",
    },
    adminSecretKey: "asWDEerfOIdgsdqRTFabvmgh",
    metrics: {
        enable: true,
        secretKey: "6c1f0f28-70f2-46ae-b031-22624a6cd8df",
    },
    enableMsgpackParser: false,
    gameManagementApiSettings: {
        BASE: "http://l2_game_management_service_local:5000",
    },
    disableCors: true,
    otel: {
        system: "VG2",
        enabled: true,
        endpoint: "http://10.10.50.69:4318/v1/traces",
    },
    botUrls: [
        "https://bots.lumigame.com/pusoy-bot-simple/move",
        "https://bots.lumigame.com/pusoy-bot-probability/move",
        "https://bots.lumigame.com/pusoy-bot-probability/move",
    ],
};
