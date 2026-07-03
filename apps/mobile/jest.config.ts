export default {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@faq-rag/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  passWithNoTests: true,
};
