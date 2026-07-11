import { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { mutate as swrMutate } from "swr";
import { MAX_UPLOAD_BYTES_CLOUD, MAX_UPLOAD_BYTES_LOCAL } from "@faq-rag/shared";
import { prepareUpload, uploadToSupabase, confirmIndex, embedBatch } from "../lib/api/document";
import { computeSHA256, computeFileSHA256 } from "../lib/api/utils/crypto";
import { formatBytes } from "../lib/utils/format";
import { logger } from "../lib/logger";

const MAX_BYTES = process.env.EXPO_PUBLIC_IS_CLOUD === "true" ? MAX_UPLOAD_BYTES_CLOUD : MAX_UPLOAD_BYTES_LOCAL;

const ALLOWED_EXTENSIONS = ["pdf", "docx", "md", "txt"];
const PICKER_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
];
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown",
  txt: "text/plain",
};

export type UploadPhase = "idle" | "hashing" | "preparing" | "uploading" | "confirming" | "embedding" | "error";

export interface UploadState {
  phase: UploadPhase;
  fileName: string | null;
  /** Upload progress fraction 0..1 (only meaningful during "uploading"). */
  progress: number;
  /** Embedded / total chunk counters (only meaningful during "embedding"). */
  embedded: number;
  totalChunks: number;
  error: string | null;
}

const IDLE: UploadState = { phase: "idle", fileName: null, progress: 0, embedded: 0, totalChunks: 0, error: null };

/**
 * Orchestrates the full mobile upload flow:
 * pick → size check → hash → prepare (409 = duplicate) → PUT to Supabase →
 * confirm index → embedBatch loop → refresh document list.
 */
export function useDocumentUpload() {
  const [state, setState] = useState<UploadState>(IDLE);

  const reset = useCallback(() => setState(IDLE), []);

  const pickAndUpload = useCallback(async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: PICKER_MIME_TYPES, base64: false });
    if (picked.canceled) return;
    const asset = picked.assets[0];

    const ext = asset.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setState({ ...IDLE, phase: "error", fileName: asset.name, error: "Only pdf, docx, md and txt are supported" });
      return;
    }

    const size = asset.size ?? 0;
    if (size <= 0 || size > MAX_BYTES) {
      setState({
        ...IDLE,
        phase: "error",
        fileName: asset.name,
        error: `File exceeds the ${formatBytes(MAX_BYTES)} limit`,
      });
      return;
    }

    try {
      setState({ ...IDLE, phase: "hashing", fileName: asset.name });
      // expo-file-system's File API is native-only; on web the picker hands us
      // a DOM File instead, so hash (and later upload) go through raw bytes.
      const webFile = Platform.OS === "web" ? asset.file : undefined;
      const hash = webFile ? await computeSHA256(await webFile.arrayBuffer()) : await computeFileSHA256(asset.uri);

      setState((s) => ({ ...s, phase: "preparing" }));
      const mime = asset.mimeType || MIME_BY_EXT[ext];
      let prep;
      try {
        prep = await prepareUpload({ name: asset.name, size, mime, hash });
      } catch (err) {
        const status = (err as { status?: number }).status;
        const message = status === 409 ? "File already exists" : err instanceof Error ? err.message : String(err);
        setState({ ...IDLE, phase: "error", fileName: asset.name, error: message });
        return;
      }

      setState((s) => ({ ...s, phase: "uploading", progress: 0 }));
      await uploadToSupabase(webFile ?? asset.uri, prep.signedUrl, (fraction) =>
        setState((s) => ({ ...s, progress: fraction })),
      );
      setState((s) => ({ ...s, progress: 1 }));

      setState((s) => ({ ...s, phase: "confirming" }));
      await confirmIndex(prep.docId);

      setState((s) => ({ ...s, phase: "embedding", embedded: 0, totalChunks: 0 }));
      let embedded = 0;
      while (true) {
        const result = await embedBatch(prep.docId);
        embedded += result.embedded;
        const total = embedded + result.remaining;
        // Progress is shown by the modal; the document list is refreshed once
        // after the loop instead of per batch.
        setState((s) => ({ ...s, embedded, totalChunks: total }));
        if (result.remaining === 0 || result.status !== "indexing") break;
      }

      await swrMutate("/api/documents");
      setState(IDLE);
    } catch (err) {
      logger.error("Document upload failed:", err instanceof Error ? err.message : String(err));
      void swrMutate("/api/documents");
      setState({
        ...IDLE,
        phase: "error",
        fileName: asset.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  return { state, pickAndUpload, reset };
}
