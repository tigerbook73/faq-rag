export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warmIndexingWorker, enqueueIndexing } = await import("./src/lib/ingest/indexing-queue");
    warmIndexingWorker();
    await resumePendingDocuments(enqueueIndexing);
  }
}

async function resumePendingDocuments(enqueue: (docId: string, filePath: string) => void) {
  const [{ prisma }, path, fs] = await Promise.all([
    import("./src/lib/db/client"),
    import("path"),
    import("fs/promises"),
  ]);

  const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

  const pending = await prisma.document.findMany({
    where: { status: "pending" },
    select: { id: true, name: true },
  });

  if (pending.length === 0) return;

  console.log(`[resume] Found ${pending.length} pending document(s), checking files...`);

  for (const doc of pending) {
    const filePath = path.default.join(UPLOAD_DIR, doc.id, doc.name);
    try {
      await fs.default.access(filePath);
      console.log(`[resume] Resuming: ${doc.name} (${doc.id})`);
      enqueue(doc.id, filePath);
    } catch {
      console.warn(`[resume] File missing for ${doc.name} (${doc.id}), marking failed`);
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "failed", errorMsg: "File missing, please re-upload" },
      });
    }
  }
}
