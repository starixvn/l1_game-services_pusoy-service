import { Hand } from "@rd/pusoy-rules";
import axios from "axios";

export const getArrangementFromBot = async (botUrl: string, cards: number[]): Promise<Hand<number[]> | undefined> => {
    const data = {
        private: {
            player_id: "",
            arrangement_id: "",
            input_hand: 0,
            input: cards,
        },
    };
    const rawData = await axios.post(botUrl, data).then((res) => {
        return res.data;
    });

    return rawData?.private.output.map((item: any) => ({
        front: item.segment_3,
        middle: item.segment_2,
        back: item.segment_1,
    }));
};
