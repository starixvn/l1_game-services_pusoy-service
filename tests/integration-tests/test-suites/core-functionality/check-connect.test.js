import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";
import { checkConnect } from "../../helper/helper";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("check connect", () => {
    it("connected", (done) => {
        checkConnect(socketOptions, done);
    });
});
