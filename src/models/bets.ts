import mongoose from "mongoose";

const bet = {
    roundId: { type: Number, required: true },

    uid: { type: String, required: true },
    name: { type: String, required: true },

    betwin: { type: Number, default: 0 },
    time: { type: Date },
    totalAmount: { type: Number, default: 0 },

    siteId: { type: String },
    freeBet: { type: Boolean, default: false },

    playerId: { type: String },
    operatorId: { type: String, required: false },
    paid: { type: Boolean, default: false },
};

const bets = mongoose.model(
    "pusoy_bets",
    new mongoose.Schema({
        ...bet,
        currency: { type: String },
        rate: { type: Number, required: true },
    })
);

const tmpBets = mongoose.model("pusoy_tmpbets", new mongoose.Schema(bet));

export { bets, tmpBets };
