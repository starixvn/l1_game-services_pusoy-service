import { Hand } from "@rd/pusoy-rules";

export const isSameCards = (currentHand: Hand<number[]>, newHand: Hand<number[]>): boolean => {
    const currentCards = [...currentHand.front, ...currentHand.middle, ...currentHand.back];
    const newCards = [...newHand.front, ...newHand.middle, ...newHand.back];

    if (currentCards.length !== newCards.length) {
        return false;
    }

    for (const card of currentCards) {
        if (!newCards.includes(card)) {
            return false;
        }
    }

    return true;
};
