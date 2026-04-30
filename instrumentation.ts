export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { IS_CLOUD } = await import("./src/lib/config");
    if (!IS_CLOUD) {
      const { warmIndexingWorker } = await import("./src/lib/ingest/indexing-queue");
      warmIndexingWorker();
    }
  }
}
