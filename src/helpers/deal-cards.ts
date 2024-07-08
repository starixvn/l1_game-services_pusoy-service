import { shuffle } from "sc-common/helpers/array-helper";

export const dealCards = (numberOfPlayers: number): number[][] => {
    let deck: number[] = [];
    for (let i = 0; i < 52; i++) {
        deck.push(i);
    }

    deck = shuffle(deck);

    let hands: number[][] = [];
    for (let i = 0; i < numberOfPlayers; i++) {
        hands.push([]);
    }

    for (let i = 0; i < deck.length; i++) {
        hands[i % numberOfPlayers].push(deck[i]);
    }

    return hands;
};
