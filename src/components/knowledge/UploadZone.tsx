"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { config } from "@/lib/config";

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function UploadZone() {
  const [progress, setProgress] = useState<number | null>(null);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setProgress(0);

      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Each file occupies an equal slice of 0–100%
        const sliceStart = Math.round((i / files.length) * 100);
        const sliceSize = Math.round(100 / files.length);
        const pct = (localPct: number) => sliceStart + Math.round((localPct / 100) * sliceSize);

        try {
          // Step 1: compute SHA-256 (0–5% of slice)
          setProgress(pct(0));
          const hash = await computeSHA256(file);
          setProgress(pct(5));

          // Step 2: request signed upload URL from server
          const prepareRes = await fetch("/api/documents/prepare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, size: file.size, mime: file.type, hash }),
          });

          if (!prepareRes.ok) {
            const data = await prepareRes.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error ?? `Prepare failed (${prepareRes.status})`);
          }

          const { docId, signedUrl } = (await prepareRes.json()) as { docId: string; signedUrl: string };
          setProgress(pct(10));

          // Step 3: upload directly to Supabase Storage (10–90% of slice)
          await new Promise<void>((resolve, reject) => {
            const form = new FormData();
            form.append("cacheControl", "3600");
            form.append("", file); // Supabase Storage SDK format

            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setProgress(pct(10 + Math.round((e.loaded / e.total) * 80)));
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed (${xhr.status})`));
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.open("PUT", signedUrl);
            xhr.send(form);
          });
          setProgress(pct(90));

          // Step 4: trigger indexing (A-path fallback; webhook may already handle it)
          await fetch(`/api/documents/${docId}/index`, { method: "POST" }).catch(() => {});
          setProgress(pct(100));

          success++;
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      setProgress(null);

      if (errors.length === 0) {
        toast.success(`Uploaded ${success} file(s). Indexing in background…`);
      } else {
        toast.error(`${success} uploaded, ${errors.length} failed: ${errors.join("; ")}`);
      }

      await mutate("/api/documents");
      router.refresh();
    },
    [mutate, router],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    for (const { file, errors } of rejections) {
      if (errors.some((e) => e.code === "file-too-large")) {
        toast.error(`${file.name}: exceeds 50 KB limit`);
      } else {
        toast.error(`Unsupported file type: ${file.name}. Supported: .md .txt .pdf .docx`);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "text/markdown": [".md"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: config.embedding.maxBytesCloud,
    disabled: progress !== null,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        } ${progress !== null ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-muted-foreground text-sm">
          {progress !== null
            ? `Uploading… ${progress}%`
            : isDragActive
              ? "Drop files here"
              : "Drag & drop files here, or click to select"}
        </p>
        <p className="text-muted-foreground/60 mt-1 text-xs">Supports .md .txt .pdf .docx</p>
      </div>

      {progress !== null && <Progress value={progress} className="h-1.5" />}
    </div>
  );
}
