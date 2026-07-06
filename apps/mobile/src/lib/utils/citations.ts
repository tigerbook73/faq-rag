/**
 * Remove inline citation markers the LLM may emit: [^n], (^n), [n].
 *
 * The current system prompt no longer asks for markers, but stored messages
 * from before the prompt change (and occasional model habit) still contain
 * them. [^n] and (^n) are citation-only syntax and are always stripped; [n]
 * is only stripped when n matches a known citation id, so plain text like
 * arr[0] survives. A single leading space is consumed with the marker.
 */
export function stripCitationMarks(content: string, citationIds: ReadonlySet<number>): string {
  return content
    .replace(/ ?\[\^(\d+)\]/g, "")
    .replace(/ ?\(\^(\d+)\)/g, "")
    .replace(/ ?\[(\d+)\]/g, (match, n) => (citationIds.has(parseInt(n, 10)) ? "" : match));
}
