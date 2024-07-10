import { GameClientDriver, normalUser, eventTypes } from "sc-game-service-integration-utils";
import gameSettings from "../../_stubs/game-settings";
import { getTimeOutToPlacingBetTime, initUserSession } from "../../helper/helper";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("when place bet", () => {
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

    it("should round bet choices", async () => {
        // Arrange
        const inGameData = await client.handleGameEvent((data) => data.remainingTime);
        setTimeout(() => {
            client.emit(eventTypes.bet, { betChoices: { big: 100.9, specific1: 30.2 }, clientSeed: "1234" });
        }, getTimeOutToPlacingBetTime(inGameData.remainingTime, gameSettings.durations) * 1000);

        // Act
        const result = await client.handleGameEvent((data) => data.endBet);

        // Assert
        console.log(result);
        expect(result.endBet).toBe(130);
        // expect(result.notice.errorCode).toBe("SB1925");
    });
});
