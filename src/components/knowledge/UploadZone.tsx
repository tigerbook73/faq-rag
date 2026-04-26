"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { uploadDocuments, type UploadState } from "../../../app/knowledge/actions";

export function UploadZone() {
  const [state, dispatch, isPending] = useActionState<UploadState | null, FormData>(
    uploadDocuments,
    null,
  );
  const prevTimestamp = useRef<number>(0);

  useEffect(() => {
    if (!state || state.timestamp === prevTimestamp.current) return;
    prevTimestamp.current = state.timestamp;
    if (state.failed === 0) {
      toast.success(`Uploaded ${state.success} file(s). Indexing in background…`);
    } else {
      toast.error(`${state.success} uploaded, ${state.failed} failed.`);
    }
  }, [state]);

  const onDrop = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      const formData = new FormData();
      for (const file of files) formData.append("file", file);
      dispatch(formData);
    },
    [dispatch],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/markdown": [".md"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    disabled: isPending,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />
      <p className="text-muted-foreground text-sm">
        {isPending ? "Uploading…" : isDragActive ? "Drop files here" : "Drag & drop files here, or click to select"}
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">Supports .md .txt .pdf .docx</p>
    </div>
  );
}
