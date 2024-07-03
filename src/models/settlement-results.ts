import { Settlement } from "@rd/pusoy-rules";
import mongoose from "mongoose";

const modelName = "settlement-results";

export type Hand<DataType> = {
    front: DataType;
    middle: DataType;
    back: DataType;
};

const settlementResultSchema = new mongoose.Schema<Settlement>(
    {
        crack: {
            isCrack: { type: Boolean, required: true },
            score: { type: Number, required: true },
        },
        natural: {
            type: Map,
            of: Number,
        },
        royalty: {
            front: { type: Map, of: Number },
            middle: { type: Map, of: Number },
            back: { type: Map, of: Number },
        },
        normal: {
            front: { type: Number, required: true },
            middle: { type: Number, required: true },
            back: { type: Number, required: true },
        },
        pusoy: {
            partial: {
                type: Map,
                of: Number,
            },
            full: { type: Number, required: true },
        },
        sum: { type: Number, required: true },
    },
    { _id: false }
);

const Schema = new mongoose.Schema({
    id: { type: Number, required: true },
    settlementResult: { type: settlementResultSchema },
    time: { type: Date, default: new Date() },
    exchangeRateId: { type: Number, require: true },
});

export default mongoose.model(modelName, Schema);
