import { asClass, asValue, AwilixContainer } from "awilix";
import { Table } from "sc-game-base";
import GameCron from "./crons/game-cron";
import ProcessBetQueue from "./crons/process-bet-queue";
import {
    CreateNewTableConsumer,
    InGameConsumer,
    PlaceBetConsumer,
    SettleGameRoundConsumer,
    SubmitArrangementConsumer,
    SurveyConsumer,
    UserDisconnectConsumer,
} from "./consumers";
import { betLogs, bets, rounds, tmpBets, bots, survey } from "./models";
import Bot from "./crons/bot";
import SocketRouter from "./router/socket-router";
import BotArrangementConsumer from "./consumers/bot-arrangement-consumer";
import { GameStatusPublisher, RoundResultPublisher } from "./publishers";

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
            botsRepository: asValue(bots),
            surveyRepository: asValue(survey),
        });
    }

    registerCrons() {
        super.registerCrons();

        this.container.register({
            bot: asClass(Bot).singleton(),
            gameCron: asClass(GameCron).singleton().proxy(),
            processBetQueue: asClass(ProcessBetQueue).singleton().proxy(),
        });
    }

    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            userDisconnectConsumer: asClass(UserDisconnectConsumer).singleton(),
            inGameConsumer: asClass(InGameConsumer).singleton(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            submitArrangementConsumer: asClass(SubmitArrangementConsumer).singleton(),
            botArrangementConsumer: asClass(BotArrangementConsumer).singleton(),
            surveyConsumer: asClass(SurveyConsumer).singleton(),
            createNewTableConsumer: asClass(CreateNewTableConsumer).singleton(),
        });
    }

    registerPublishers() {
        super.registerPublishers();

        this.container.register({
            roundResultPublisher: asClass(RoundResultPublisher).singleton(),
            gameStatusPublisher: asClass(GameStatusPublisher).singleton(),
        });
    }

    registerRouters() {
        super.registerRouters();
        this.container.register({
            socketRouter: asClass(SocketRouter).proxy(),
        });
    }
}
