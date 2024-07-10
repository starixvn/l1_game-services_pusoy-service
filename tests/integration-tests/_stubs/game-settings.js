import gameSettings from "../../../build/game-settings";

export default Object.assign(gameSettings, {
    durations: {
        lockArrange: 1,
        wholeRound: 5,
        settleEffect: {
            crack: 1,
            natural: 1,
            compareHands: 1,
            pusoy: {
                mini: 1,
                full: 1,
            },
        },
    }
});
