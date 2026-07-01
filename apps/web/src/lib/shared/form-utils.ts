import type { ZodError } from "zod";

export function parseZodFieldErrors<T extends Record<string, unknown>>(
  error: ZodError,
): Partial<Record<keyof T, string>> {
  const result: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof T;
    if (field && !(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}
