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
        joinConfigs: {
            numberOfBots: [0, 1, 2, 3],
            rate: [0.7, 0.25, 0.04, 0.01],
        },
        leaveConfigs: {
            numberOfBots: [0, 1, 2, 3],
            rate: [0.7, 0.25, 0.04, 0.01],
        },
    },
};
