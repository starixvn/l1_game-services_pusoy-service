import { Settlement as RawSettlement } from "@rd/pusoy-rules";
import mongoose from "mongoose";

export type HandResult = {
    hand: {
        front: number[];
        middle: number[];
        back: number[];
    };
    playerId: string;
    slot: number;
};

const resultSchema = new mongoose.Schema<HandResult>(
    {
        hand: {
            front: { type: [Number], require: true },
            middle: { type: [Number], require: true },
            back: { type: [Number], require: true },
        },
        playerId: { type: String, require: false },
        time: { type: Date, default: new Date() },
        slot: { type: Number, require: false },
    },
    { _id: false }
);

export type Settlement = RawSettlement & { playerId: string; time: Date };

const settlementResultSchema = new mongoose.Schema<Settlement>(
    {
        crack: {
            isCrack: { type: Boolean, required: true },
            units: { type: Number, required: true },
        },
        natural: {
            name: { type: String, default: "" },
            units: { type: Number, required: true },
        },
        royalty: {
            front: { name: { type: String, default: "" }, units: { type: Number, default: 0 } },
            middle: { name: { type: String, default: "" }, units: { type: Number, default: 0 } },
            back: { name: { type: String, default: "" }, units: { type: Number, default: 0 } },
        },
        normal: {
            front: { type: Number, required: true },
            middle: { type: Number, required: true },
            back: { type: Number, required: true },
        },
        pusoy: {
            mini: {
                type: Map,
                of: Number,
            },
            full: { type: Number, required: true },
        },
        sum: { type: Number, required: true },
        playerId: { type: String, require: false },
        time: { type: Date, default: new Date() },
    },
    { _id: false }
);

export interface IRound {
    id: number;
    result: {
        [playerId: string]: HandResult;
    };
    settlementResult: { [playerId: string]: Settlement };
    roundStartTime: Date;
    time: Date;
    exchangeRateId: number;
}

const Schema = new mongoose.Schema<IRound>({
    id: { type: Number, required: true },
    result: { type: Map, of: resultSchema },
    settlementResult: { type: Map, of: settlementResultSchema },
    roundStartTime: { type: Date, default: new Date() },
    time: { type: Date, default: new Date() },
    exchangeRateId: { type: Number, require: true },
});

const Round = mongoose.model("pusoy_rounds", Schema);

export default Round;
