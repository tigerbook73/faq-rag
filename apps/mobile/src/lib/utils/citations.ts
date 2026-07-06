/**
 * Remove inline citation markers the LLM emits: [^n], (^n), [n].
 *
 * The system prompt asks for [n] markers so the server can filter citations
 * to the ones the answer actually uses; they are display noise afterwards.
 * [^n] and (^n) are citation-only syntax and are always stripped; [n] is
 * only stripped when n matches a known citation id, so plain text like
 * arr[0] survives. A single leading space is consumed with the marker.
 */
export function stripCitationMarks(content: string, citationIds: ReadonlySet<number>): string {
  return content
    .replace(/ ?\[\^(\d+)\]/g, "")
    .replace(/ ?\(\^(\d+)\)/g, "")
    .replace(/ ?\[(\d+)\]/g, (match, n) => (citationIds.has(parseInt(n, 10)) ? "" : match));
}
