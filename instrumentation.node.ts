import { IS_CLOUD } from "./src/lib/config";

// Cloud mode uses synchronous indexing in the request handler — no worker needed
if (!IS_CLOUD) {
  const path = await import("path");
  const fs = await import("fs/promises");
  const { prisma } = await import("./src/lib/db/client");
  const { warmIndexingWorker, enqueueIndexing } = await import("./src/lib/ingest/indexing-queue");

  const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

  async function resumePendingDocuments() {
    const pending = await prisma.document.findMany({
      where: { status: "pending" },
      select: { id: true, name: true, filePath: true },
    });

    if (pending.length === 0) return;

    console.log(`[resume] Found ${pending.length} pending document(s), checking files...`);

    for (const doc of pending) {
      const filePath = doc.filePath ?? path.default.join(UPLOAD_DIR, doc.id, doc.name);
      try {
        await fs.default.access(filePath);
        console.log(`[resume] Resuming: ${doc.name} (${doc.id})`);
        enqueueIndexing(doc.id, filePath);
      } catch {
        console.warn(`[resume] File missing for ${doc.name} (${doc.id}), marking failed`);
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: "failed",
            errorMsg: "File missing, please re-upload",
          },
        });
      }
    }
  }

  warmIndexingWorker();
  await resumePendingDocuments();
}
