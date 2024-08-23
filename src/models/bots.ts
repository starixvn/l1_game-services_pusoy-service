import mongoose from "mongoose";

export interface IBot {
    botId: number;
    name: string;
    botUrl: string;
    score: number;
    roundId: number;
}

const Schema = new mongoose.Schema<IBot>({
    roundId: { type: Number, default: 0, required: true },
    name: { type: String, required: false },
    botId: { type: String, required: true },
    botUrl: { type: String, required: true },
    score: { type: Number, default: 0, required: false },
    time: { type: Date, default: new Date() },
});

export default mongoose.model("pusoy_bots", Schema);
