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
            playerId: "$result.k",
            day: {
                $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$time",
                },
            },
        },
    },
    {
        $group: {
            _id: "$day",
            uniquePlayers: { $addToSet: "$playerId" },
        },
    },
    {
        $project: {
            _id: 0,
            day: "$_id",
            numberOfRealPlayersPerDay: {
                $size: "$uniquePlayers",
            },
        },
    },
    {
        $sort: { uniqueRealPlayersByDay: -1 },
    },
]);
