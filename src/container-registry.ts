import { AwilixContainer } from "awilix";
import { Table } from "sc-game-base";

export default class ContainerRegistry extends Table.TableContainerRegistry {
    register(appConfigs: any, definition: any, gameData: any): AwilixContainer<any> {
        super.register(appConfigs, definition, gameData);

        return this.container;
    }
}
