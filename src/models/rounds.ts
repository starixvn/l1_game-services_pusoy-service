import { Settlement } from "@rd/pusoy-rules";
import mongoose from "mongoose";

const seatMappingSchema = new mongoose.Schema(
    {
        seatId: { type: String, require: true },
        playerId: { type: String, require: true },
    },
    { _id: false }
);

const resultSchema = new mongoose.Schema(
    {
        hand: {
            front: { type: [Number], require: true },
            middle: { type: [Number], require: true },
            back: { type: [Number], require: true },
        },
        isAlertNatural: { type: Boolean, default: false },
        seatId: { type: String, required: true },
    },
    { _id: false }
);

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
        seatId: { type: String, required: true },
    },
    { _id: false }
);

const Schema = new mongoose.Schema({
    id: { type: Number, required: true },
    result: { type: [resultSchema] },
    settlementResult: { type: [settlementResultSchema] },
    seats: { type: [seatMappingSchema] },
    time: { type: Date, default: new Date() },
    exchangeRateId: { type: Number, require: true },
});

export default mongoose.model("pusoy_rounds", Schema);
