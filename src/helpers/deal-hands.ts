import { Hand } from "@rd/pusoy-rules";
import { shuffle } from "./shuffle";
import { getDefaultHandFromCards } from "./get-default-hand-from-cards";

export const dealHands = (numberOfPlayers: number): Hand<number[]>[] => {
    let deck: number[] = [];
    for (let i = 0; i < 52; i++) {
        deck.push(i);
    }

    deck = shuffle(deck);

    let cards: number[][] = [];
    for (let i = 0; i < numberOfPlayers; i++) {
        cards.push([]);
    }

    for (let i = 0; i < deck.length; i++) {
        cards[i % numberOfPlayers].push(deck[i]);
    }

    return cards.map((hand) => getDefaultHandFromCards(hand));
};
