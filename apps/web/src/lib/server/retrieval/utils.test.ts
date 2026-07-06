import { sanitizeChunkContent, filterCitationsByAnswer } from "./utils";

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

describe("filterCitationsByAnswer", () => {
  const citations = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it("keeps only citations referenced in the answer", () => {
    const answer = "Vacation is 15 days [1]. Sick leave is separate [3].";
    expect(filterCitationsByAnswer(answer, citations)).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it("falls back to all citations when the answer has no markers", () => {
    expect(filterCitationsByAnswer("No markers here.", citations)).toEqual(citations);
  });

  it("falls back to all citations when only unknown ids are cited", () => {
    expect(filterCitationsByAnswer("See [7].", citations)).toEqual(citations);
  });

  it("deduplicates repeated markers", () => {
    const answer = "First [2], again [2].";
    expect(filterCitationsByAnswer(answer, citations)).toEqual([{ id: 2 }]);
  });

  it("returns an empty list when there are no citations", () => {
    expect(filterCitationsByAnswer("Anything [1].", [])).toEqual([]);
  });
});
