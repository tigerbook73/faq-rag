export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warmIndexingWorker } = await import("./src/lib/ingest/indexing-queue");
    warmIndexingWorker();
  }
}
