export default {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@faq-rag/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  passWithNoTests: true,
};
