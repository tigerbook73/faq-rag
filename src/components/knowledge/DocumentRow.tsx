"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface Document {
  id: string;
  name: string;
  lang: string | null;
  status: string;
  sizeBytes: number;
  errorMsg: string | null;
  totalChunks: number | null;
  createdAt: Date;
  _count: { chunks: number };
}

const ACTIVE_STATUSES = new Set(["pending", "uploaded", "indexing"]);

export function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "indexed") return "default";
  if (status === "failed") return "destructive";
  if (ACTIVE_STATUSES.has(status)) return "secondary";
  return "outline";
}

interface DocumentRowProps {
  doc: Document;
  isDeleting: boolean;
  isReindexing: boolean;
  onReindex: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentRow({ doc, isDeleting, isReindexing, onReindex, onDelete }: DocumentRowProps) {
  return (
    <TableRow key={doc.id}>
      <TableCell className="max-w-32 truncate font-medium sm:max-w-50">{doc.name}</TableCell>
      <TableCell className="hidden sm:table-cell">{doc.lang}</TableCell>
      <TableCell className="hidden sm:table-cell">
        {doc.status === "indexing" && doc.totalChunks ? `${doc._count.chunks} / ${doc.totalChunks}` : doc._count.chunks}
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
        {doc.status === "failed" && doc.errorMsg && (
          <p className="text-destructive mt-1 max-w-48 text-xs break-words">{doc.errorMsg}</p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
        {new Date(doc.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="space-x-2 text-right">
        {(doc.status === "indexed" || doc.status === "failed") && (
          <Button variant="outline" size="sm" disabled={isReindexing} onClick={() => onReindex(doc.id)}>
            {isReindexing ? "Reindexing…" : "Reindex"}
          </Button>
        )}
        <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => onDelete(doc.id)}>
          Delete
        </Button>
      </TableCell>
    </TableRow>
  );
}
