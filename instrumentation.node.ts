import path from "path";
import fs from "fs/promises";
import { prisma } from "./src/lib/db/client";
import { warmIndexingWorker, enqueueIndexing } from "./src/lib/ingest/indexing-queue";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

async function resumePendingDocuments() {
  const pending = await prisma.document.findMany({
    where: { status: "pending" },
    select: { id: true, name: true },
  });

  if (pending.length === 0) return;

  console.log(`[resume] Found ${pending.length} pending document(s), checking files...`);

  for (const doc of pending) {
    const filePath = path.join(UPLOAD_DIR, doc.id, doc.name);
    try {
      await fs.access(filePath);
      console.log(`[resume] Resuming: ${doc.name} (${doc.id})`);
      enqueueIndexing(doc.id, filePath);
    } catch {
      console.warn(`[resume] File missing for ${doc.name} (${doc.id}), marking failed`);
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "failed", errorMsg: "File missing, please re-upload" },
      });
    }
  }
}

warmIndexingWorker();
await resumePendingDocuments();
