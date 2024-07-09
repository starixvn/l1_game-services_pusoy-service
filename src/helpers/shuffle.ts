import Chance from "chance";
import { MersenneTwister19937, Random } from "random-js";
import { shuffle as d3Shuffle } from "d3-array";
import lodashShuffle from "lodash.shuffle";

const chance = new Chance();
const random = new Random(MersenneTwister19937.autoSeed());

const shuffle1 = <T>(array: T[]) => chance.shuffle(chance.shuffle(chance.shuffle(array)));

const shuffle2 = <T>(array: T[]) => {
    return d3Shuffle(d3Shuffle(d3Shuffle(array)));
};

const shuffle3 = <T>(array: T[]) => lodashShuffle(lodashShuffle(lodashShuffle(array)));

const shuffle4 = <T>(array: T[]) => random.shuffle([...array]);

export const shuffle = <T>(arr: T[]): T[] => {
    const randomModes = [shuffle1, shuffle2, shuffle3, shuffle4];
    return chance.pickone(randomModes)(arr);
};
