/**
 * Sanitizes chunk content for the LLM context.
 * Replaces citation-like patterns that might confuse the LLM or conflict with our own citation format.
 */
export function sanitizeChunkContent(content: string): string {
  return content.replace(/\[\^(\d+)\]/g, "(^$1)").replace(/\[(\d+)\]/g, "($1)");
}

/**
 * Keeps only the citations whose [n] marker appears in the answer.
 * Falls back to the full list when no known marker is found, so a model
 * that forgot to cite still shows its sources instead of hiding them all.
 */
export function filterCitationsByAnswer<TCitation extends { id: number }>(
  answer: string,
  citations: TCitation[],
): TCitation[] {
  const cited = new Set<number>();
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    cited.add(parseInt(match[1], 10));
  }
  const used = citations.filter((c) => cited.has(c.id));
  return used.length > 0 ? used : citations;
}
