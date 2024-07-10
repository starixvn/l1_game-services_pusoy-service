import {  initUserSession } from "../../helper/helper";
import { GameClientDriver, normalUser } from "sc-game-service-integration-utils";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("signin", () => {
    it("should receive signed in response", async () => {
        //Arrange & Act
        const client = new GameClientDriver(socketOptions, initUserSession(normalUser));

        const sendSignInInterval =  setInterval(() => {
            client.sendSignInEvent();
        }, 500);

        // Act
        await client.handleSignedInEvent();

        clearInterval(sendSignInInterval);
        
        client.close();
    });
});
