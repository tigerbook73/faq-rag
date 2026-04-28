import { truncateHistory } from "./truncate";
import { HISTORY_TOKEN_BUDGET } from "../config";

type Msg = { role: "user" | "assistant"; content: string };

function msg(role: "user" | "assistant", chars: number): Msg {
  return { role, content: "x".repeat(chars) };
}

// Each char ≈ 0.25 tokens, so budget tokens * 4 = max chars
const MAX_CHARS = HISTORY_TOKEN_BUDGET * 4;

describe("truncateHistory", () => {
  it("returns [] for empty history", () => {
    expect(truncateHistory([])).toEqual([]);
  });

  it("returns all messages when total is within budget", () => {
    const history: Msg[] = [msg("user", 100), msg("assistant", 100), msg("user", 100)];
    expect(truncateHistory(history)).toHaveLength(3);
  });

  it("drops oldest messages when over budget", () => {
    // Fill budget with 3 large messages, add a 4th that pushes over
    const chunkSize = Math.floor(MAX_CHARS / 3) - 1;
    const history: Msg[] = [
      msg("user", chunkSize), // oldest — should be dropped
      msg("assistant", chunkSize),
      msg("user", chunkSize),
      msg("assistant", chunkSize), // this tips over budget
    ];
    const result = truncateHistory(history);
    expect(result.length).toBeLessThan(4);
    // The last message should be retained (newest-first priority)
    expect(result[result.length - 1].content).toBe(history[3].content);
  });

  it("drops a leading assistant turn after truncation", () => {
    // Oldest user message is dropped, leaving assistant as the first
    const chunkSize = Math.floor(MAX_CHARS / 2) - 1;
    const history: Msg[] = [
      msg("user", chunkSize), // dropped — too old
      msg("assistant", chunkSize), // now would be first — must be dropped
      msg("user", 10),
    ];
    const result = truncateHistory(history);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe(history[2].content);
  });

  it("returns [] when a single message exceeds budget", () => {
    const history: Msg[] = [msg("user", MAX_CHARS + 100)];
    expect(truncateHistory(history)).toEqual([]);
  });
});
