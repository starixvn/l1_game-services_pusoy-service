export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://l2_game_api_prod:5000",
        authUrl: "http://l2_auth_api_prod:5000",
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
        url: "mongodb://lmn_backend:%21%23x97%25uYZv%2A%5E%25%3E%7C%2Aqg%40E7FHi%3F9l%7B9r%3CK@10.99.99.53:39210,10.99.99.54:39210,10.99.99.188:39210,10.99.99.187:39210/?replicaSet=L2_SabaMain&appName=pusoy",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "http://2b5b82bf699543ddb296364568bc30be@10.2.189.50:9009/52",
        logIdentifier: "Pusoy",
        env: "PROD",
    },
    authenticateSettings: {
        url: "http://l2_auth_api_prod:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://l2_user_service_prod:5000",
    },
    adminSecretKey: "asWDEer4yGdgsdqR4uqmKQZgh",
    metrics: {
        enable: true,
        secretKey: "30d15293-c7de-4c77-9293-b85d6c5bfe1a",
    },
    enableMsgpackParser: true,
    gameManagementApiSettings: {
        BASE: "http://l2_game_management_service_prod:5000",
    },
    otel: {
        system: "VG2",
        enabled: true,
        endpoint: "http://10.2.189.50:4318/v1/traces",
    },
    botUrls: [
        "http://l1_pusoy_bots_sai_PROD:5000/move",
    ],
};
