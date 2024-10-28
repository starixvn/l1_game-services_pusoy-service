db.pusoy_rounds.aggregate([
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
                    cond: {
                        $and: [{ $eq: ["$$result.v.slot", 0] }],
                    },
                },
            },
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
        },
    },
    {
        $project: {
            id: 1,
            playerId: 1,
            roundDuration: { $divide: [{ $subtract: ["$slot0FinishTime", "$roundTimeStart"] }, 1000] },
        },
    },
    {
        $bucket: {
            groupBy: "$roundDuration",
            boundaries: [0, 10, 20, 30, 40, 50],
            default: "over 50s",
            output: {
                count: { $sum: 1 },
                rounds: { $push: "$id" },
                avgDuration: { $avg: "$roundDuration" },
            },
        },
    },
]);
