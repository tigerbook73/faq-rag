export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { config } = await import("./src/lib/shared/config");
    if (!config.embedding.useOpenAI) {
      const { warmIndexingWorker } = await import("./src/lib/server/ingest/indexing-queue");
      warmIndexingWorker();
    }
  }
}
