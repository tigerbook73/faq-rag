import path from "path";
import fs from "fs/promises";

const SUPPORTED_EXTS = new Set([".md", ".txt", ".pdf", ".docx"]);

/** Resolves a file or directory path to a list of supported document files. */
export async function collectFiles(target: string): Promise<string[]> {
  const resolved = path.resolve(target);
  const stat = await fs.stat(resolved);

  if (!stat.isDirectory()) return [resolved];

  const entries = await fs.readdir(resolved);
  return entries.filter((e) => SUPPORTED_EXTS.has(path.extname(e).toLowerCase())).map((e) => path.join(resolved, e));
}
