"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onUploaded: () => void;
}

export function UploadZone({ onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploading(true);
      setMessage(null);

      let success = 0;
      let failed = 0;

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/documents", { method: "POST", body: formData });
          if (res.ok) {
            success++;
          } else {
            const err = await res.json();
            console.error(err);
            failed++;
          }
        } catch {
          failed++;
        }
      }

      setMessage(
        failed === 0
          ? `Uploaded ${success} file(s). Indexing in background…`
          : `${success} uploaded, ${failed} failed.`,
      );
      setUploading(false);
      onUploaded();
    },
    [onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/markdown": [".md"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    disabled: uploading,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-muted-foreground text-sm">
          {uploading ? "Uploading…" : isDragActive ? "Drop files here" : "Drag & drop files here, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">Supports .md .txt .pdf .docx</p>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
