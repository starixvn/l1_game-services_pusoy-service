import { Hand } from "@rd/pusoy-rules";

export const isSameCards = (hand1: Hand<number[]>, hand2: Hand<number[]>): boolean => {
    const setCard1 = new Set([...hand1.front, ...hand1.middle, ...hand1.back]);
    const setCard2 = new Set([...hand2.front, ...hand2.middle, ...hand2.back]);

    const isSame = setCard1.difference(setCard2).size === 0 && setCard1.size === setCard2.size;

    return isSame;
};
