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
            day: { $dateToString: { format: "%Y-%m-%d", date: "$time" } },
        },
    },
    {
        $group: {
            _id: "$playerId",
            uniqueDays: { $addToSet: "$day" },
            totalRounds: { $sum: 1 },
        },
    },
    {
        $project: {
            _id: 0,
            playerId: "$_id",
            numberOfDaysPlayed: {
                $size: "$uniqueDays",
            },
            totalRounds: 1,
        },
    },
    {
        $sort: { numberOfDaysPlayed: -1, totalRounds: -1 },
    },
]);
