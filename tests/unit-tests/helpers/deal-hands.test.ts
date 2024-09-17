import { dealHands } from "../../../src/helpers/deal-hands";
import { shuffle } from "../../../src/helpers/shuffle";
import { NUMBER_OF_DEAL_HAND } from "../../../src/constants";
import { Hand } from "@rd/pusoy-rules";

jest.mock("../../../src/helpers/shuffle");

describe("dealHands", () => {
    beforeEach(() => {
        // Mock the shuffle function to return an ordered deck for predictability in tests
        (shuffle as jest.Mock).mockImplementation((deck: number[]) => [...deck]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should deal distinct cards from 0 to 51 to the default number of players (NUMBER_OF_DEAL_HAND)", () => {
        const numberOfPlayers = NUMBER_OF_DEAL_HAND;

        const hands = dealHands(numberOfPlayers);

        // Collect all cards from all hands
        const allCards = hands.reduce((acc: number[], hand: Hand<number[]>) => {
            return acc.concat(hand.front, hand.middle, hand.back);
        }, []);

        // Expect that the shuffle function is called once
        expect(shuffle).toHaveBeenCalledTimes(1);

        // Expect the correct number of hands to be returned
        expect(hands.length).toBe(numberOfPlayers);

        // Expect each hand to have 13 cards divided into front, middle, and back
        hands.forEach((hand: Hand<number[]>) => {
            expect(hand.front.length).toBe(3);
            expect(hand.middle.length).toBe(5);
            expect(hand.back.length).toBe(5);
        });

        // Expect the total number of cards to be 52
        expect(allCards.length).toBe(52);

        // Check that every card is unique by converting to a Set
        const uniqueCards = new Set(allCards);
        expect(uniqueCards.size).toBe(52);

        // Check that all cards are within the valid range (0-51)
        allCards.forEach((card) => {
            expect(card).toBeGreaterThanOrEqual(0);
            expect(card).toBeLessThanOrEqual(51);
        });
    });

    const testCases = [{ numberOfPlayers: 2 }, { numberOfPlayers: 3 }, { numberOfPlayers: 4 }];
    it.each(testCases)("should deal distinct cards from 0 to 51 evenly to a custom number of players %s", ({ numberOfPlayers }) => {
        const hands = dealHands(numberOfPlayers);

        // Expect the correct number of hands to be returned
        expect(hands.length).toBe(numberOfPlayers);

        // Collect all cards from all hands
        const allCards = hands.reduce((acc: number[], hand: Hand<number[]>) => {
            return acc.concat(hand.front, hand.middle, hand.back);
        }, []);

        // Expect each hand to have 13 cards divided into front, middle, and back
        hands.forEach((hand: Hand<number[]>) => {
            expect(hand.front.length).toBe(3);
            expect(hand.middle.length).toBe(5);
            expect(hand.back.length).toBe(5);
        });

        // Expect the total number of cards to be numberOfPlayers * 13
        expect(allCards.length).toBe(numberOfPlayers * 13);

        // Check that every card is unique by converting to a Set
        const uniqueCards = new Set(allCards);
        expect(uniqueCards.size).toBe(numberOfPlayers * 13);

        // Check that all cards are within the valid range (0-51)
        allCards.forEach((card) => {
            expect(card).toBeGreaterThanOrEqual(0);
            expect(card).toBeLessThanOrEqual(51);
        });
    });
});
