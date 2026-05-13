/**
 * Sanitizes chunk content for the LLM context.
 * Replaces citation-like patterns that might confuse the LLM or conflict with our own citation format.
 */
export function sanitizeChunkContent(content: string): string {
  return content.replace(/\[\^(\d+)\]/g, "(^$1)").replace(/\[(\d+)\]/g, "($1)");
}
