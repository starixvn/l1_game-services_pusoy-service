export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://l1_game_api_sit:5000",
        authUrl: "http://l1_auth_api_sit:5000",
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
        url: "mongodb://lmn_backend:LmnBackend%40517@10.99.99.53:39130,10.99.99.54:39130,10.99.99.188:39130,10.99.99.187:39130/",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "http://52368c4019044019885440599c180bda@10.2.190.51:9009/24",
        logIdentifier: "Pusoy",
        env: "SIT",
    },
    authenticateSettings: {
        url: "http://l1_auth_api_sit:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://l1_user_service_sit:5000",
    },
    adminSecretKey: "asWDEerfOIdgsdqRTFabvmgh",
    metrics: {
        enable: true,
        secretKey: "6c1f0f28-70f2-46ae-b031-22624a6cd8df",
    },
    enableMsgpackParser: true,
    gameManagementApiSettings: {
        BASE: "http://l1_game_management_service_sit:5000",
    },
    otel: {
        system: "SG",
        enabled: true,
        endpoint: "http://10.2.190.51:4318/v1/traces",
    },
    botUrls: [
        "http://l1_pusoy_bots_sai_SIT:5000/move",
    ],
};
