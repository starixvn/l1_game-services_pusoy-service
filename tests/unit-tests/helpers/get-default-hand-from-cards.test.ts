import { getDefaultHandFromCards } from "../../../src/helpers";
import { Hand } from "@rd/pusoy-rules";

describe("getDefaultHandFromCards", () => {
    it("should return the correct hand structure from a given set of cards", () => {
        // Arrange
        const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        const expectedHand: Hand<number[]> = {
            front: [1, 2, 3],
            middle: [4, 5, 6, 7, 8],
            back: [9, 10, 11, 12, 13],
        };

        // Act
        const result = getDefaultHandFromCards(cards);

        // Assert
        expect(result).toEqual(expectedHand);
    });
});
