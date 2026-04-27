"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export function UploadZone() {
  const [progress, setProgress] = useState<number | null>(null);
  const router = useRouter();

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setProgress(0);

      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const baseProgress = Math.round((i / files.length) * 100);

        try {
          await new Promise<void>((resolve, reject) => {
            const formData = new FormData();
            formData.append("file", file);

            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const fileSlice = Math.round((e.loaded / e.total) * (100 / files.length));
                setProgress(baseProgress + fileSlice);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                try {
                  const body = JSON.parse(xhr.responseText);
                  reject(new Error(body.error ?? xhr.statusText));
                } catch {
                  reject(new Error(xhr.statusText));
                }
              }
            };

            xhr.onerror = () => reject(new Error("Network error"));
            xhr.open("POST", "/api/documents");
            xhr.send(formData);
          });
          success++;
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      setProgress(null);

      if (errors.length === 0) {
        toast.success(`Uploaded ${success} file(s). Indexing in background…`);
      } else {
        toast.error(
          `${success} uploaded, ${errors.length} failed: ${errors.join("; ")}`,
        );
      }

      router.refresh();
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/markdown": [".md"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    disabled: progress !== null,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50"
        } ${progress !== null ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-muted-foreground text-sm">
          {progress !== null
            ? `Uploading… ${progress}%`
            : isDragActive
              ? "Drop files here"
              : "Drag & drop files here, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">Supports .md .txt .pdf .docx</p>
      </div>

      {progress !== null && (
        <Progress value={progress} className="h-1.5" />
      )}
    </div>
  );
}
