import { parentPort } from "worker_threads";
import { processDocument } from "./pipeline";

if (!parentPort) throw new Error("Must be run as a worker thread");

parentPort.on("message", async ({ docId, filePath }: { docId: string; filePath: string }) => {
  try {
    await processDocument(docId, filePath);
    parentPort!.postMessage({ ok: true, docId });
  } catch (err) {
    parentPort!.postMessage({ ok: false, docId, error: String(err) });
  }
});
