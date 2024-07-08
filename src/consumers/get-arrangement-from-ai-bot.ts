import { Model } from "mongoose";
import appConfigs from "../app-configs";
import { getArrangementFromBot } from "../helpers";
import { IRound } from "../models/rounds";

export default class GetArrangementFromAIBotConsumer {
    roundsRepository: Model<IRound>;

    constructor(roundsRepository: Model<IRound>) {
        this.roundsRepository = roundsRepository;
    }

    async getArrangementFromBotForRound(roundId: number) {
        const round = await this.roundsRepository.findOne({ id: roundId }).lean().exec();

        if (!round) {
            return;
        }

        for (let i = 1; i < round.result.length; i++) {
            const botUrl = appConfigs.botUrlMapping[round.result[i].playerId];
            const cards = [...round.result[i].hand.front, ...round.result[i].hand.middle, ...round.result[i].hand.back];
            const hand = await getArrangementFromBot(botUrl, cards);
            if (!hand) {
                continue;
            }
            round.result[i].time = new Date();
            round.result[i].hand = hand;
        }
    }
}
