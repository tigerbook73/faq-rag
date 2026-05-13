"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { config } from "@/lib/shared/config";
import { type DocumentItem } from "@/lib/shared/schemas/document";
import { prepareUpload, confirmIndex } from "@/lib/client/documents-api";

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function UploadZone() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setIsUploading(true);

      let success = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          const hash = await computeSHA256(file);

          const { docId, signedUrl, document } = await prepareUpload({ name: file.name, size: file.size, mime: file.type, hash });

          await new Promise<void>((resolve, reject) => {
            const form = new FormData();
            form.append("cacheControl", "3600");
            form.append("", file); // Supabase Storage SDK format

            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed (${xhr.status})`));
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.open("PUT", signedUrl);
            xhr.send(form);
          });

          await mutate<{ items: DocumentItem[] }>(
            "/api/documents",
            (current) => {
              if (!current) return { items: [document] };
              if (current.items.some((item) => item.id === document.id)) return current;
              return { ...current, items: [document, ...current.items] };
            },
            false,
          );

          await confirmIndex(docId).catch(() => {});

          success++;
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      setIsUploading(false);

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
    disabled: isUploading,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-2 transition-colors md:p-4 ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        } ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex items-center justify-between gap-3 md:block md:text-center">
          <div className="min-w-0">
            <p className="text-muted-foreground truncate text-sm">
              {isUploading ? "Uploading..." : isDragActive ? "Drop files here" : "Add documents"}
            </p>
            <p className="text-muted-foreground/60 hidden text-xs md:mt-1 md:block">
              Drag & drop files here, or click to select
            </p>
          </div>
          <span className="bg-primary text-primary-foreground inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-sm font-medium md:hidden">
            Upload
          </span>
        </div>
      </div>
    </div>
  );
}
