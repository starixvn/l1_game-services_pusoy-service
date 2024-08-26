import mongoose from "mongoose";

export interface ISurvey {
    playerId: string;
    playerName: string;
    wishToPlayWithRealMoney: boolean;
}

const Schema = new mongoose.Schema<ISurvey>({
    playerId: { type: Number, default: 0, required: true },
    playerName: { type: String, required: false },
    wishToPlayWithRealMoney: { type: Boolean, default: false },
    time: { type: Date, default: new Date() },
});

export default mongoose.model("pusoy_survey", Schema);
