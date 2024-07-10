import mongoose from "mongoose";
import users from "../models/users";
import promotions from "../models/promotions";
import { middlewares } from "sc-common";
import {
    createCurrencyGroupGames,
    createDummyCurrency,
    createDummyUsers,
    createExchangeRate,
    createGameConfig,
    createPartnerConfig,
    normalUser,
} from "sc-game-service-integration-utils";

import { bets, rounds, betLogs } from "../../../build/models";
import { currencyData, game, gameConfig, roundsData, userBetData, promotions as promotionData, userBetLogData, pfResults } from "./test-data";
import appConfigs from "../../../build/app-configs.IGT";

const connectDatabase = async () => {
    await middlewares.database.configureDatabase(mongoose, appConfigs.database);

    await clearAllData();
};

const clearAllData = async () => {
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
        await collection.drop();
    }
};

export const createTestData = async () => {
    await connectDatabase();
    await createExchangeRate();
    await createGameConfig(gameConfig);
    const partnerConfig = await createPartnerConfig(game.id);

    const currency = await createDummyCurrency(partnerConfig.partnerId, currencyData.code, currencyData.name);
    await createCurrencyGroupGames(currency.groupId, game.id, gameConfig);
    await createDummyUsers(currency);
    await createRounds();
    await createUserBetData();
    await createUserBetLogData();
    await createPromotionData();

    console.log("Create exchange rate, game config & dummy user for testing successfully!");
    process.exit(0);
};

const getUserId = async (playerId) => {
    const user = await users.findOne({ "local.playerId": playerId }, { _id: true }).lean();
    return user._id.toString();
};

const createRounds = async () => {
    return rounds.insertMany(roundsData);
};



const createUserBetData = async () => {
    const userId = await getUserId(normalUser.playerId);
    const betData = userBetData(userId);
    return bets.insertMany(betData);
};

const createUserBetLogData = async () => {
    const userId = await getUserId(normalUser.playerId);
    const betLogData = userBetLogData(userId);
    return betLogs.insertMany(betLogData);
};

const createPromotionData = async () => {
    console.log("create promotion", new Date());
    await promotions.insertMany(promotionData);
};

createTestData();
