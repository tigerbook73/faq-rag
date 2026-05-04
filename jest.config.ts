import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          types: ["jest", "node"],
        },
      },
    ],
  },
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/lib/retrieval/", "<rootDir>/e2e/"],
};

export default config;
