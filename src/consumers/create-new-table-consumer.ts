import { Core } from "sc-game-base";
import GameData, { RealPlayer } from "../game-data";
import InGameConsumer from "./in-game-consumer";
import GameDefinition from "../game-definition";

export default class CreateNewTableConsumer {
    inGameConsumer: InGameConsumer;
    gameData: GameData;
    publisher: Core.BaseEventPublishers.BaseEventPublisher;
    definition: GameDefinition;

    constructor(
        inGameConsumer: InGameConsumer,
        gameData: GameData,
        publisher: Core.BaseEventPublishers.BaseEventPublisher,
        definition: GameDefinition
    ) {
        this.inGameConsumer = inGameConsumer;
        this.gameData = gameData;
        this.publisher = publisher;
        this.definition = definition;
    }

    async consume(realPlayer: RealPlayer) {
        if (this.gameData.ingame[realPlayer.profile.name]?.roundData?.observer) {
            const extraTime = 1;
            const newTable = this.inGameConsumer.createNewTable(realPlayer);

            delete this.gameData.ingame[realPlayer.profile.name];

            this.gameData.ingame[realPlayer.profile.name] = newTable;

            const payload = await this.inGameConsumer.buildPayload(realPlayer);

            payload.remainingTime = this.definition.durations.timeline.transition + extraTime;

            this.publisher.publishToUser(realPlayer.UID, payload);
        }
    }
}
