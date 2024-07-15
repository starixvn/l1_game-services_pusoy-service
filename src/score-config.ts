import { Natural } from "@rd/pusoy-rules";

const scoreConfig = {
    id: 4,
    normal: 1,
    natural: [
        {
            name: Natural.Dragon,
            units: 12,
        },
        {
            name: Natural.SixPairs,
            units: 6,
        },
        {
            name: Natural.ThreeFlushes,
            units: 3,
        },
        {
            name: Natural.ThreeStraights,
            units: 3,
        },
    ],
    crack: 6,
    pusoy: {
        full: {
            isWinnerTakeAll: true,
            units: 6,
        },
        mini: 3,
    },
    royalty: {
        front: {
            threeOfAKind: 3,
        },
        middle: {
            fullHouse: 2,
            fourOfAKind: 8,
            straightFlush: 10,
            royalFlush: 20,
        },
        back: {
            fourOfAKind: 4,
            straightFlush: 5,
            royalFlush: 10,
        },
    },
};

export default scoreConfig;
