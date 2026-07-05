import { File } from "expo-file-system";
import { CryptoDigestAlgorithm, digest } from "expo-crypto";

/** SHA-256 hex digest of raw bytes (works on native and web via expo-crypto). */
export async function computeSHA256(bytes: ArrayBuffer): Promise<string> {
  const hashBuffer = await digest(CryptoDigestAlgorithm.SHA256, bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mirrors apps/web/src/components/knowledge/UploadZone.tsx's computeSHA256,
// used to detect duplicate uploads via PrepareUploadInput.hash.
export async function computeFileSHA256(fileUri: string): Promise<string> {
  const file = new File(fileUri);
  const bytes = await file.arrayBuffer();
  return computeSHA256(bytes);
}
