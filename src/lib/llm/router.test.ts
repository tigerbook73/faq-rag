import { getProvider } from "./router";
import { PROVIDER } from "./providers";

// Mocking providers to avoid actual client initialization
jest.mock("./openai", () => ({
  openaiProvider: { name: "openai" },
}));
jest.mock("./deepseek", () => ({
  deepseekProvider: { name: "deepseek" },
}));
jest.mock("./claude", () => ({
  claudeProvider: { name: "claude" },
}));

describe("getProvider integration", () => {
  it("resolves deepseek when requested", () => {
    const provider = getProvider(PROVIDER.DEEPSEEK);
    expect(provider.name).toBe("deepseek");
  });

  it("resolves openai when requested", () => {
    const provider = getProvider(PROVIDER.OPENAI);
    expect(provider.name).toBe("openai");
  });

  it("resolves claude when requested (or default fallback)", () => {
    const provider = getProvider(PROVIDER.CLAUDE);
    expect(provider.name).toBe("claude");
  });
});
