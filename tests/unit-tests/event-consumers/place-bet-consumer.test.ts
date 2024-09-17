import { stub } from "jest-auto-stub";
import PlaceBetConsumer from "../../../src/consumers/place-bet-consumer";
import GameData, { RealPlayer } from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import { Core } from "sc-game-base";

describe("PlaceBetConsumer", () => {
    let placeBetConsumer: PlaceBetConsumer;
    const gameData = stub<GameData>();
    const definition = stub<GameDefinition>();
    const publisher = stub<Core.BaseEventPublishers.BaseEventPublisher>();

    beforeEach(() => {
        placeBetConsumer = new PlaceBetConsumer(definition, gameData, publisher);

        gameData.disabled = false;
        gameData.gameConfigs.maxbet = 10;
        gameData.umMessages = "Game is disabled";
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should push bet to betQueue if conditions are met", () => {
        const realPlayer: RealPlayer = {
            profile: { name: "player1" },
            UID: "player1UID",
        } as RealPlayer;

        const payload = {
            roundId: 1,
            amount: 100,
            m: null,
            receivedTime: new Date(),
            mode: null,
            clientSentTime: new Date(),
            time: new Date(),
        };

        const tableData = {
            canDestroy: false,
            roundData: null,
            betQueue: [],
        } as any;

        gameData.ingame["player1"] = tableData;

        placeBetConsumer.consume(realPlayer, payload);

        expect(tableData.betQueue.length).toBe(1);
        expect(tableData.betQueue[0].payload.amount).toBe(1000);
    });

    it("should publish to user if game is disabled", () => {
        const realPlayer: RealPlayer = {
            profile: { name: "player1" },
            UID: "player1UID",
        } as RealPlayer;

        const payload = {
            roundId: 1,
            amount: 100,
            m: null,
            receivedTime: new Date(),
            mode: null,
            clientSentTime: new Date(),
            time: new Date(),
        };

        gameData.disabled = true;
        gameData.ingame["player1"] = {
            canDestroy: false,
            roundData: null,
            betQueue: [],
        } as any;

        placeBetConsumer.consume(realPlayer, payload);

        expect(publisher.publishToUser).toHaveBeenCalledWith("player1UID", {
            um: true,
            endBet: -1,
            um_message: "Game is disabled",
            isPlaying: false,
            isActive: true,
        });
    });

    it("should publish to user if tableData can be destroyed", () => {
        const realPlayer: RealPlayer = {
            profile: { name: "player1" },
            UID: "player1UID",
        } as RealPlayer;

        const payload = {
            roundId: 1,
            amount: 100,
            m: null,
            receivedTime: new Date(),
            mode: null,
            clientSentTime: new Date(),
            time: new Date(),
        };

        gameData.ingame["player1"] = {
            canDestroy: true,
            roundData: null,
            betQueue: [],
        } as any;

        placeBetConsumer.consume(realPlayer, payload);

        expect(publisher.publishToUser).toHaveBeenCalledWith("player1UID", {
            um: false,
            endBet: -1,
            um_message: "Game is disabled",
            isPlaying: false,
            isActive: false,
        });
    });

    it("should publish to user if roundData exists", () => {
        const realPlayer: RealPlayer = {
            profile: { name: "player1" },
            UID: "player1UID",
        } as RealPlayer;

        const payload = {
            roundId: 1,
            amount: 100,
            m: null,
            receivedTime: new Date(),
            mode: null,
            clientSentTime: new Date(),
            time: new Date(),
        };

        gameData.ingame["player1"] = {
            canDestroy: false,
            roundData: {},
            betQueue: [],
        } as any;

        placeBetConsumer.consume(realPlayer, payload);

        expect(publisher.publishToUser).toHaveBeenCalledWith("player1UID", {
            um: false,
            endBet: -1,
            um_message: "Game is disabled",
            isPlaying: true,
            isActive: true,
        });
    });
});
