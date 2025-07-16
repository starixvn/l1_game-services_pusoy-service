export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://l2-game-api-klprod-service:5000",
        authUrl: "http://l2-auth-api-klprod-service:5000",
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
        url: "mongodb://lmn_backend:%21%23x97%25uYZv%2A%5E%25%3E%7C%2Aqg%40E7FHi%3F9l%7B9r%3CK@10.146.34.26:39210,10.146.34.27:39210,10.146.34.30:39210,10.146.34.28:39210/?replicaSet=L2_SabaMain&appName=pusoy",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "http://2b5b82bf699543ddb296364568bc30be@sentry-scklprod-ovs.ops-klprod.gamora.prod/52",
        logIdentifier: "Pusoy",
        env: "PROD",
    },
    authenticateSettings: {
        url: "http://l2-auth-api-klprod-service:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://l2-user-service-klprod-service:5000",
    },
    adminSecretKey: "asWDEer4yGdgsdqR4uqmKQZgh",
    metrics: {
        enable: true,
        secretKey: "30d15293-c7de-4c77-9293-b85d6c5bfe1a",
    },
    enableMsgpackParser: true,
    gameManagementApiSettings: {
        BASE: "http://l2-game-management-service-klprod-service:5000",
    },
    otel: {
        system: "VG2",
        enabled: true,
        endpoint: "http://jaeger-collector-sc.ops-klprod.gamora.prod:32318/v1/traces",
    },
    botUrls: [
        "http://l1-pusoy-bots-sai-klprod-service.l1:5000/move",
        "http://l1-chinese-poker-bot-probability-klprod-service.l1:5000/move",
        "http://l1-bots-chinese-poker-bot-simple-klprod-service.l1:5000/move",
    ],
};
