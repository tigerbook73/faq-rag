import path from "path";
import fs from "fs/promises";
import { ingestFile } from "../src/lib/ingest/pipeline";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: pnpm ingest <file-or-directory>");
    process.exit(1);
  }

  const resolved = path.resolve(target);
  const stat = await fs.stat(resolved);

  const files: string[] = [];

  if (stat.isDirectory()) {
    const entries = await fs.readdir(resolved);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if ([".md", ".txt", ".pdf", ".docx"].includes(ext)) {
        files.push(path.join(resolved, entry));
      }
    }
  } else {
    files.push(resolved);
  }

  if (files.length === 0) {
    console.log("No supported files found.");
    process.exit(0);
  }

  console.log(`Ingesting ${files.length} file(s)…`);

  for (const file of files) {
    console.log(`Processing: ${path.basename(file)}`);
    try {
      const id = await ingestFile(file);
      console.log(`  Done → id=${id}`);
    } catch (err) {
      console.error(`  Error:`, err);
    }
  }

  console.log("Ingestion complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
