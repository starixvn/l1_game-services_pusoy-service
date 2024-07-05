import { Core } from "sc-game-base";

export default class SettleGameConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    async settleTable(playerName: string) {
        const betTrack = this.gameData.ingame[playerName].betTracks;

        if (betTrack) {
            const round = (await this.roundsRepository.findOne({ id: betTrack.roundId }).lean().exec()) as {
                result: any[];
                settlementResult: any[];
            };

            const hands = round.result.map((x) => x.hand);
            const settlementResult = this.definition.settle(hands);

            await this.roundsRepository.updateOne({ id: betTrack.roundId }, { settlementResult: settlementResult }).exec();

            delete this.gameData.ingame[playerName];
            this.roundResultPublisher.publishRoundResult({ roundId: betTrack.roundId, settlementResult: settlementResult });
        }
    }
}
