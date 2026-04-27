import { Worker } from "worker_threads";
import path from "path";

let worker: Worker | null = null;

function createWorker(): Worker {
  const workerPath = path.resolve(process.cwd(), "src/lib/ingest/indexing-worker.ts");
  const w = new Worker(workerPath, {
    execArgv: ["-r", "tsx/cjs"],
  });

  w.on("message", ({ ok, docId, error }: { ok: boolean; docId: string; error?: string }) => {
    if (ok) {
      console.log(`[indexing-queue] indexed ${docId}`);
    } else {
      console.error(`[indexing-queue] failed ${docId}:`, error);
    }
  });

  w.on("error", (err) => {
    console.error("[indexing-queue] worker error:", err);
    worker = null;
  });

  w.on("exit", (code) => {
    if (code !== 0) console.error(`[indexing-queue] worker exited with code ${code}`);
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
