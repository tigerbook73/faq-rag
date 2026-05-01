export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { config } = await import("./src/lib/config");
    if (!config.embedding.useOpenAI) {
      const { warmIndexingWorker } = await import("./src/lib/ingest/indexing-queue");
      warmIndexingWorker();
    }
  }
}
