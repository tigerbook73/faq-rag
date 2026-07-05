/**
 * Citation marker patterns the LLM may emit: [^n], (^n), [n]. Shared between
 * extraction (useStreamingChat's used-citation filter) and rendering
 * (MessageBubble's superscript normalization) so the two sides never disagree
 * about what counts as a citation marker.
 */
export const CITATION_MARK_PATTERNS: readonly RegExp[] = [/\[\^(\d+)\]/g, /\(\^(\d+)\)/g, /\[(\d+)\]/g];
