import { GameClientDriver, normalUser } from "sc-game-service-integration-utils";
import { initUserSession } from "../../helper/helper";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("when getPfInfo", () => {
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

    it("should return pfInfo", async () => {
        // Arrange
        client.emit("getPfInfo", { drawId: 2 });
        const pfInfo =     {
            clientSeeds: [],
            roundId: 2,
            drawId: 2,
            serverSeedHash: "583da9eb8f2d90246e4665e755fcd1f4a6c82d519ec6b3d95317e2ab76b2d8f0",
            serverSeed: '{"random":"5;3;6","secret":"OEr2wr2uHlcJRIWWxR3jsQWrO.~Ofhs4"}',
            encryptedServerSeed: {
                iv: "1e0dce148eedef6cbb89b9675dea0021",
                content:
                    "83fb43b6522d58ce3600f9f58cdff8da61cfe91e904d79c265bbd8fef756063760473f5ce93cd9ce688f71b0edbbcebdd5cb649ae4ae64e39effd121ff1b",
            },
            finalHash:
                "8dbacd680a97e6a4b7737c374ad29870aded28f79bccaeb70d062c1df0933cb61dd3b36e24f9e827a1af8e02b56873ead9fcd4046b995ae658be347a08fbc7ec",
            mergeClientSeed: "",
            mergeSeed: '{"random":"5;3;6","secret":"OEr2wr2uHlcJRIWWxR3jsQWrO.~Ofhs4"}',
        };

        // Act
        const actual = await client.handleGameEvent((data) => data.clientSeedDetail);

        // Assert
        expect(actual.pfResult.serverSeedHash).toEqual(pfInfo.serverSeedHash);
        expect(JSON.stringify(actual.pfResult.serverSeed)).toEqual(JSON.stringify(pfInfo.serverSeed));
        expect(actual.clientSeedDetail).toEqual({});
    });
});
