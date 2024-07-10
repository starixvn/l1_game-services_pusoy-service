import { GameClientDriver, normalUser, eventTypes } from "sc-game-service-integration-utils";
import gameSettings from "../../_stubs/game-settings";
import { getTimeOutToPlacingBetTime, initUserSession } from "../../helper/helper";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("rate limit test", () => {
    let client;
    const maxRequests = appConfigs.socketOptions.maxRequestsPerInterval;

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

    describe("when place-bet", () => {
        it("should NOT limit with rate limit", async () => {
            // Arrange
            const inGameData = await client.handleGameEvent((data) => data.remainingTime);
            const placeBetTime = getTimeOutToPlacingBetTime(inGameData.remainingTime, gameSettings.durations) * 1000;

            // Act
            setTimeout(() => {
                for (let i = 0; i < maxRequests + 1; i++) {
                    client.emit(eventTypes.bet, { betChoices: {  odd: 20.9, red4:30.2  }, clientSeed: "1234" });
                }
            }, placeBetTime);

            const promise = new Promise((resolve, reject) => {
                setTimeout(() => resolve(client.socket.connected), placeBetTime + 1000);
            });

            // Assert
            const connected = await promise;
            expect(connected).toBe(true);
        });
    });

    describe("when getHistory", () => {
        it("should limit with rate limit", async () => {
            // Arrange
            for (let i = 0; i < maxRequests + 1; i++) {
                client.emit("getHistory", { page: 1 });
            }

            // Act
            const { error } = await client.waitForEvent(eventTypes.message, (data) => data.error);

            // Assert
            expect(error).toBe("Rate limit exceeded; request rejected. Request again after 10 seconds");
        });
    });
});
