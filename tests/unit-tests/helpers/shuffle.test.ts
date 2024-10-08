import { shuffle } from "../../../src/helpers/shuffle";

describe("shuffle", () => {
    it("should return an array with the same elements but in different order", () => {
        const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const shuffledArray = shuffle([...array]);

        expect(shuffledArray).toHaveLength(array.length);
        expect(shuffledArray).toEqual(expect.arrayContaining(array));
        expect(shuffledArray).not.toEqual(array);
    });

    it("should handle an empty array", () => {
        const array: number[] = [];
        const shuffledArray = shuffle([...array]);

        expect(shuffledArray).toHaveLength(0);
    });

    it("should handle an array with one element", () => {
        const array = [1];
        const shuffledArray = shuffle([...array]);

        expect(shuffledArray).toHaveLength(1);
        expect(shuffledArray).toEqual([1]);
    });

    it("should handle an array with duplicate elements", () => {
        const array = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5];
        const shuffledArray = shuffle([...array]);

        expect(shuffledArray).toHaveLength(array.length);
        expect(shuffledArray).toEqual(expect.arrayContaining(array));
        expect(shuffledArray).not.toEqual(array);
    });
});
