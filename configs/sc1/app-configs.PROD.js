export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://l1_game_api_prod:5000",
        authUrl: "http://l1_auth_api_prod:5000",
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
        url: "mongodb://lmn_backend:M7K4ttH%2AtZ3ml%3F%29%7CA%5DjN4%3FLBhwF%266IO%3C@10.99.99.53:39110,10.99.99.54:39110,10.99.99.188:39110,10.99.99.187:39110/?replicaSet=SabaMain&appName=pusoy",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "http://58fc00e79ab34a3bab04a79038760cb8@10.2.189.50:9009/8",
        logIdentifier: "Pusoy",
        env: "PROD",
    },
    authenticateSettings: {
        url: "http://l1_auth_api_prod:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://l1_user_service_prod:5000",
    },
    adminSecretKey: "asWDEer4yGdgsdqR4uqmKQZgh",
    metrics: {
        enable: true,
        secretKey: "30d15293-c7de-4c77-9293-b85d6c5bfe1a",
    },
    enableMsgpackParser: true,
    gameManagementApiSettings: {
        BASE: "http://l1_game_management_service_prod:5000",
    },
    otel: {
        system: "SG",
        enabled: true,
        endpoint: "http://10.2.189.50:4318/v1/traces",
    },
    botUrls: [
        "http://l1_pusoy_bots_sai_PROD:5000/move",
        "http://l1_chinese_poker_bot_probability_PROD:5000/move",
        "http://l1_bots_chinese_poker_bot_simple_PROD:5000/move",
    ],
};
