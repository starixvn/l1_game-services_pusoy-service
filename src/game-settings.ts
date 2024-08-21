export default {
    id: 94,
    name: "Pusoy",
    durations: {
        timeline: {
            transition: 55,
            deal: 52,
            arrangement: 50,
            animation: 70,
        },
        animation: {
            normal: 6,
            crack: 2,
            natural: 2,
            pusoy: {
                mini: 5,
                full: 5,
            },
            chipFly: 6,
        },
    },
    provablyFair: false,
    suitesMapper: { 0: "spade", 1: "heart", 2: "club", 3: "diamond" },
    botSettings: {
        amountJoinConfigs: {
            numberOfBots: [0, 1, 2, 3],
            rate: [0.6, 0.25, 0.1, 0.05],
        },
        amountLeaveConfigs: {
            numberOfBots: [0, 1, 2, 3],
            rate: [0.6, 0.25, 0.1, 0.05],
        },
    },
};
