[
    {
        $project: {
            id: 1,
            time: 1,
            result: {
                $filter: {
                    input: {
                        $objectToArray: "$result",
                    },
                    as: "result",
                    cond: { $eq: ["$$result.v.slot", 0] },
                },
            },
            settlementResult: 1,
        },
    },
    {
        $unwind: "$result",
    },
    {
        $project: {
            id: 1,
            playerId: "$result.k",
            roundTimeStart: "$time",
            slot0FinishTime: "$result.v.time",
            settlementResult: 1,
            roundDuration: { $divide: [{ $subtract: ["$result.v.time", "$time"] }, 1000] },
        },
    },
    {
        $match: {
            roundDuration: { $gte: 10, $lte: 50 },
        },
    },
    {
        $project: {
            id: 1,
            playerId: 1,
            roundDuration: 1,
            settlementResult: {
                $filter: {
                    input: {
                        $objectToArray: "$settlementResult",
                    },
                    as: "result",
                    cond: {
                        $and: [{ $eq: ["$$result.v.slot", 0] }],
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
];
