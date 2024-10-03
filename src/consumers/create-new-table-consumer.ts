import { Core } from "sc-game-base";
import GameData, { RealPlayer } from "../game-data";
import InGameConsumer from "./in-game-consumer";

export default class CreateNewTableConsumer {
    inGameConsumer: InGameConsumer;
    gameData: GameData;
    publisher: Core.BaseEventPublishers.BaseEventPublisher;

    constructor(inGameConsumer: InGameConsumer, gameData: GameData, publisher: Core.BaseEventPublishers.BaseEventPublisher) {
        this.inGameConsumer = inGameConsumer;
        this.gameData = gameData;
        this.publisher = publisher;
    }

    async consume(realPlayer: RealPlayer) {
        if (this.gameData.ingame[realPlayer.profile.name]?.roundData?.observer) {
            const newTable = this.inGameConsumer.createNewTable(realPlayer);

            delete this.gameData.ingame[realPlayer.profile.name];

            this.gameData.ingame[realPlayer.profile.name] = newTable;

            const payload = await this.inGameConsumer.buildPayload(realPlayer);

            this.publisher.publishToUser(realPlayer.UID, payload);
        }
    }
}
