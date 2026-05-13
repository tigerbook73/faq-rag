import { Worker } from "worker_threads";
import path from "path";
import { logger } from "../logger";

let worker: Worker | null = null;

function createWorker(): Worker {
  const workerPath = path.resolve(process.cwd(), "src/lib/ingest/indexing-worker.ts");
  const w = new Worker(workerPath, {
    execArgv: ["-r", "tsx/cjs"],
  });

  w.on("message", ({ ok, docId, error }: { ok: boolean; docId: string; error?: string }) => {
    if (ok) {
      logger.info({ docId }, "indexing-queue: indexed");
    } else {
      logger.error({ docId, error }, "indexing-queue: failed");
    }
  });

  w.on("error", (err) => {
    logger.error({ err }, "indexing-queue: worker error");
    worker = null;
  });

  w.on("exit", (code) => {
    if (code !== 0) logger.error({ code }, "indexing-queue: worker exited with non-zero code");
    worker = null;
  });

  return w;
}

function getWorker(): Worker {
  worker ??= createWorker();
  return worker;
}

export function enqueueIndexing(docId: string, filePath: string): void {
  getWorker().postMessage({ docId, filePath });
}

export function warmIndexingWorker(): void {
  getWorker();
}
