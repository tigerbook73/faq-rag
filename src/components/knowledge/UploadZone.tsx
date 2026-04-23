"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface Props {
  onUploaded: () => void;
}

export function UploadZone({ onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploading(true);

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

      if (failed === 0) {
        toast.success(`Uploaded ${success} file(s). Indexing in background…`);
      } else {
        toast.error(`${success} uploaded, ${failed} failed.`);
      }
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
  );
}
