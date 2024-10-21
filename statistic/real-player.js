db.pusoy_rounds.aggregate([
    {
        $project: {
            id: 1,
            settlementResult: {
                $filter: {
                    input: {
                        $objectToArray: "$settlementResult",
                    },
                    as: "result",
                    cond: {
                        $and: [
                            { $eq: ["$$result.v.slot", 0] },
                            // { $eq: ["$$result.v.crack.isCrack", false] }
                        ],
                    },
                },
            },
        },
    },
    {
        $unwind: "$settlementResult",
    },
    {
        $project: {
            id: 1,
            playerId: "$settlementResult.k",
            sum: "$settlementResult.v.sum",
        },
    },
    {
        $group: {
            _id: null,
            totalRounds: { $sum: 1 },
            totalWinRounds: {
                $sum: { $cond: [{ $gt: ["$sum", 0] }, 1, 0] },
            },
            totalTieRounds: {
                $sum: { $cond: [{ $eq: ["$sum", 0] }, 1, 0] },
            },
            totalLoseRounds: {
                $sum: { $cond: [{ $lt: ["$sum", 0] }, 1, 0] },
            },
            totalSum: { $sum: "$sum" },
        },
    },
    {
        $project: {
            _id: 0,
            totalRounds: 1,
            totalWinRounds: 1,
            totalTieRounds: 1,
            totalLoseRounds: 1,
            totalSum: 1,
            averageSum: { $divide: ["$totalSum", "$totalRounds"] },
            winPercentage: { $multiply: [{ $divide: ["$totalWinRounds", "$totalRounds"] }, 100] },
            tiePercentage: { $multiply: [{ $divide: ["$totalTieRounds", "$totalRounds"] }, 100] },
            losePercentage: { $multiply: [{ $divide: ["$totalLoseRounds", "$totalRounds"] }, 100] },
        },
    },
]);
