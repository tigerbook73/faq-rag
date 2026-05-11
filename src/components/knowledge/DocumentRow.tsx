"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type DocumentItem as Document } from "@/lib/schemas/document";
import { MoreHorizontal } from "lucide-react";

export type { Document };

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
  isUpdatingVisibility: boolean;
  onReindex: (id: string) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, visibility: "private" | "public") => void;
}

export function DocumentRow({
  doc,
  isDeleting,
  isReindexing,
  isUpdatingVisibility,
  onReindex,
  onDelete,
  onVisibilityChange,
}: DocumentRowProps) {
  const nextVisibility = doc.visibility === "public" ? "private" : "public";
  const canReindex = doc.status === "indexed" || doc.status === "failed";

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
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline">{doc.visibility}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
        {new Date(doc.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontal />
            <span className="sr-only">Open actions for {doc.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={isUpdatingVisibility}
              onClick={() => onVisibilityChange(doc.id, nextVisibility)}
            >
              Make {nextVisibility}
            </DropdownMenuItem>
            {canReindex && (
              <DropdownMenuItem disabled={isReindexing} onClick={() => onReindex(doc.id)}>
                {isReindexing ? "Reindexing..." : "Reindex"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" disabled={isDeleting} onClick={() => onDelete(doc.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
