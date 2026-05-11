"use client";

import { Fragment } from "react";
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

function chunkLabel(doc: Document) {
  return doc.status === "indexing" && doc.totalChunks ? `${doc._count.chunks} / ${doc.totalChunks}` : doc._count.chunks;
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
  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontal />
        <span className="sr-only">Open actions for {doc.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={isUpdatingVisibility} onClick={() => onVisibilityChange(doc.id, nextVisibility)}>
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
  );

  return (
    <Fragment>
      <TableRow className="md:hidden">
        <TableCell colSpan={7} className="whitespace-normal">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="truncate font-medium">{doc.name}</p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>{doc.lang}</span>
                <span>{chunkLabel(doc)} chunks</span>
                <Badge variant="outline">{doc.visibility}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                <span className="text-muted-foreground text-xs">{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
              {doc.status === "failed" && doc.errorMsg && (
                <p className="text-destructive text-xs break-words">{doc.errorMsg}</p>
              )}
            </div>
            <div className="shrink-0">{actionsMenu}</div>
          </div>
        </TableCell>
      </TableRow>
      <TableRow className="hidden md:table-row">
        <TableCell className="max-w-50 truncate font-medium">{doc.name}</TableCell>
        <TableCell>{doc.lang}</TableCell>
        <TableCell>{chunkLabel(doc)}</TableCell>
        <TableCell>
          <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
          {doc.status === "failed" && doc.errorMsg && (
            <p className="text-destructive mt-1 max-w-48 text-xs break-words">{doc.errorMsg}</p>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{doc.visibility}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
          {new Date(doc.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell className="text-right">{actionsMenu}</TableCell>
      </TableRow>
    </Fragment>
  );
}
