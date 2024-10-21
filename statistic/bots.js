db.pusoy_bots.aggregate([
    {
        $group: {
            _id: "$botUrl",
            totalRounds: { $sum: 1 },
            countWins: { $sum: { $cond: [{ $gt: ["$score", 0] }, 1, 0] } },
            countTies: { $sum: { $cond: [{ $eq: ["$score", 0] }, 1, 0] } },
            countLoses: { $sum: { $cond: [{ $lt: ["$score", 0] }, 1, 0] } },
            totalScore: { $sum: "$score" },
        },
    },
    {
        $project: {
            _id: 0,
            botUrl: "$_id",
            totalRounds: 1,
            countWins: 1,
            countTies: 1,
            countLoses: 1,
            totalScore: 1,
            averageScore: { $divide: ["$totalScore", "$totalRounds"] },
            winPercentage: { $multiply: [{ $divide: ["$countWins", "$totalRounds"] }, 100] },
            tiePercentage: { $multiply: [{ $divide: ["$countTies", "$totalRounds"] }, 100] },
            losePercentage: { $multiply: [{ $divide: ["$countLoses", "$totalRounds"] }, 100] },
        },
    },
]);
