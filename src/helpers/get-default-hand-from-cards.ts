import { Hand } from "@rd/pusoy-rules";

export const getDefaultHandFromCards = (cards: number[]): Hand<number[]> => {
    return {
        front: cards.slice(0, 3),
        middle: cards.slice(3, 8),
        back: cards.slice(8, 13),
    };
};
