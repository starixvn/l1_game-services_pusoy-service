import { isSameCards } from "../../../src/helpers";
import { Hand } from "@rd/pusoy-rules";

describe("isSameCards", () => {
    it("should return true when the two hands have the same cards", () => {
        // Arrange
        const hand1: Hand<number[]> = {
            front: [1, 2, 3],
            middle: [4, 5, 6],
            back: [7, 8, 9],
        };
        const hand2: Hand<number[]> = {
            front: [4, 5, 6],
            middle: [1, 2, 3],
            back: [7, 8, 9],
        };

        // Act
        const result = isSameCards(hand1, hand2);

        // Assert
        expect(result).toBe(true);
    });

    it("should return false when the two hands have different cards", () => {
        // Arrange
        const hand1: Hand<number[]> = {
            front: [1, 2, 3],
            middle: [4, 5, 6],
            back: [7, 8, 9],
        };
        const hand2: Hand<number[]> = {
            front: [4, 5, 6],
            middle: [1, 2, 3],
            back: [7, 8, 10],
        };

        // Act
        const result = isSameCards(hand1, hand2);

        // Assert
        expect(result).toBe(false);
    });
});
