import { config } from "../config";

type Msg = { role: "user" | "assistant"; content: string };

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateHistory(history: Msg[]): Msg[] {
  let budget = config.llm.historyTokenBudget;
  const kept: Msg[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].content);
    if (cost > budget) break;
    budget -= cost;
    kept.unshift(history[i]);
  }

  // Drop a leading assistant turn so the history always starts with "user"
  while (kept.length > 0 && kept[0].role === "assistant") {
    kept.shift();
  }

  return kept;
}
