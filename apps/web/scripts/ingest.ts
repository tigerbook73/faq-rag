import path from "path";
import { ingestFile } from "../src/lib/server/ingest/pipeline";
import { collectFiles } from "./libs/utils";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: pnpm ingest <file-or-directory>");
    process.exit(1);
  }

  const files = await collectFiles(target);

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
