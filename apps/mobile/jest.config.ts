export default {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@faq-rag/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  passWithNoTests: true,
};
