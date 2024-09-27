import appConfigs from "./app-configs";
import gameSettings from "./game-settings";
import { Core } from "sc-game-base";
import GameData from "./game-data";
import GameDefinition from "./game-definition";
import ContainerRegistry from "./container-registry";
import { createPusoyRules } from "@rd/pusoy-rules";
import scoreConfig from "./score-config";

const run = async () => {
    const pusoy = createPusoyRules(scoreConfig);
    const definition = new GameDefinition(
        gameSettings as any,
        () => {},
        pusoy.settle,
        () => {}
    );

    const gameData = new GameData(gameSettings.durations.timeline.arrangement);

    const container = new ContainerRegistry().register(appConfigs, definition, gameData);

    const app = new Core.BaseGameApp(gameSettings.name, appConfigs);

    await app.run();

    await app.startGame(container);
};

run();
