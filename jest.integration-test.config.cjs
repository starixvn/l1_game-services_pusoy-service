module.exports = async () => {
    return {
        rootDir: "./",
        verbose: true,
        transform: {
            "^.+\\.ts?$": "ts-jest",
            "^.+\\.js?$": "babel-jest",
        },
        transformIgnorePatterns: [
            "node_modules/(?!(sc-base-database|sc-common|sc-game-base|sc-base-apis|sc-api-client|jest-auto-fixture|nanoid|crypto-random-string|sc-game-service-integration-utils|sc-game-management-client|prom-client)/.*)",
        ],
        preset: "ts-jest",
        testEnvironment: "node",
        testResultsProcessor: "jest-sonar-reporter",
        reporters: ["default", ["jest-junit", { outputDirectory: "coverage", outputName: "integration-tests.xml" }]],
        coverageReporters: ["clover", "lcov", "text-summary", "cobertura"],
        coverageDirectory: "coverage",
        moduleNameMapper: {
            "d3-array": "<rootDir>/node_modules/d3-array/dist/d3-array.min.js",
        },
        testPathIgnorePatterns: ["tests/integration-tests/test-suites/"],
        globalSetup: "<rootDir>/tests/integration-tests/global-setup.cjs",
        globalTeardown: "<rootDir>/tests/integration-tests/global-teardown.cjs",
        testTimeout: 20000,
    };
};
