import { GameClientDriver, normalUser, eventTypes } from "sc-game-service-integration-utils";
import gameSettings from "../../_stubs/game-settings";
import { getTimeOutToPlacingBetTime, initUserSession } from "../../helper/helper";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("when settle", () => {
    describe("test data settle", () => {
        let client;

        beforeEach(async () => {
            client = new GameClientDriver(socketOptions, initUserSession(normalUser));

            const sendSignInInterval = setInterval(() => {
                client.sendSignInEvent();
            }, 500);

            await client.handleSignedInEvent();

            client.sendInGameEvent();

            clearInterval(sendSignInInterval);
        });

        afterEach(() => {
            client.close();
            client = null;
        });

        it("should return settled status data", async () => {
            // Arrange
            const inGameData = await client.handleGameEvent((data) => data.remainingTime);
            setTimeout(() => {
                client.emit(eventTypes.bet, { betChoices: { big: 20.9, specific1: 30.2 }, clientSeed: "1234" });
            }, getTimeOutToPlacingBetTime(inGameData.remainingTime, gameSettings.durations) * 1000);

            // Act
            const result = await client.handleGameEvent((data) => data.status);
            const { status } = result;

            // Assert
            console.log(result);
            expect(status.bet).toBeGreaterThanOrEqual(20);
        });
    });
});
