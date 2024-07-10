import { asClass, AwilixContainer } from "awilix";
import { Table } from "sc-game-base";
import GameCron from "./crons/game-cron";
import ProcessBetQueue from "./crons/process-bet-queue";
import { InGameConsumer, ManageBotConsumer, PlaceBetConsumer, SettleGameRoundConsumer, SubmitArrangementConsumer } from "./consumers";

export default class ContainerRegistry extends Table.TableContainerRegistry {
    register(appConfigs: any, definition: any, gameData: any): AwilixContainer<any> {
        super.register(appConfigs, definition, gameData);

        return this.container;
    }

    registerCrons() {
        super.registerCrons();
        this.container.register({
            gameCron: asClass(GameCron).singleton().proxy(),
            processBetQueue: asClass(ProcessBetQueue).singleton().proxy(),
        });
    }

    registerConsumers() {
        super.registerConsumers();
        this.container.register({
            inGameConsumer: asClass(InGameConsumer).singleton(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            bot: asClass(ManageBotConsumer).singleton().proxy(),
            submitArrangementConsumer: asClass(SubmitArrangementConsumer).singleton(),
        });
    }
}
