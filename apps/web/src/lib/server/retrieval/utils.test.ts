import { sanitizeChunkContent } from "./utils";

describe("sanitizeChunkContent", () => {
  it("replaces citation markers with parentheses", () => {
    const input = "According to the study [^1], the result was [2].";
    const expected = "According to the study (^1), the result was (2).";
    expect(sanitizeChunkContent(input)).toBe(expected);
  });

  it("handles multiple markers of the same type", () => {
    const input = "[^1] [^2] [1] [2]";
    const expected = "(^1) (^2) (1) (2)";
    expect(sanitizeChunkContent(input)).toBe(expected);
  });

  it("does not change text without markers", () => {
    const input = "Plain text with no citations.";
    expect(sanitizeChunkContent(input)).toBe(input);
  });

  it("handles mixed content", () => {
    const input = "Check [^123] and [456] reference.";
    const expected = "Check (^123) and (456) reference.";
    expect(sanitizeChunkContent(input)).toBe(expected);
  });
});
