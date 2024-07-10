import { asClass, asValue, AwilixContainer } from "awilix";
import { Table } from "sc-game-base";
import GameCron from "./crons/game-cron";
import ProcessBetQueue from "./crons/process-bet-queue";
import {
    InGameConsumer,
    ManageBotConsumer,
    PlaceBetConsumer,
    SettleGameRoundConsumer,
    SubmitArrangementConsumer,
    UserDisconnectConsumer,
    UserSignInConsumer,
} from "./consumers";
import { betLogs, bets, rounds, tmpBets } from "./models";
import { BaseEventConsumers } from "sc-game-base/src/core";

export default class ContainerRegistry extends Table.TableContainerRegistry {
    register(appConfigs: any, definition: any, gameData: any): AwilixContainer<any> {
        super.register(appConfigs, definition, gameData);

        return this.container;
    }

    registerModels() {
        super.registerModels();

        this.container.register({
            roundsRepository: asValue(rounds),
            betsRepository: asValue(bets),
            tempBetsRepository: asValue(tmpBets),
            betLogsRepository: asValue(betLogs),
        });
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
            userDisconnectConsumer: asClass(UserDisconnectConsumer).singleton(),
            userSignInConsumer: asClass(UserSignInConsumer).singleton(),
            inGameConsumer: asClass(InGameConsumer).singleton(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            bot: asClass(ManageBotConsumer).singleton().proxy(),
            submitArrangementConsumer: asClass(SubmitArrangementConsumer).singleton(),
        });
    }
}
