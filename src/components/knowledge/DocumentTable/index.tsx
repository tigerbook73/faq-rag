"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RefreshCw } from "lucide-react";
import { useDocumentManagement } from "./useDocumentManagement";
import { DocumentRow } from "@/components/knowledge/DocumentRow";
import { DeleteDialog, RebuildDialog } from "@/components/knowledge/DocumentDialogs";

function documentCountLabel(count: number) {
  return `${count} document${count === 1 ? "" : "s"}`;
}

export function DocumentTable() {
  const {
    documents,
    allDocuments,
    search,
    setSearch,
    deletingId,
    deleteTarget,
    setDeleteTarget,
    reindexingId,
    visibilityUpdatingId,
    rebuilding,
    rebuildProgress,
    rebuildDialogOpen,
    setRebuildDialogOpen,
    isManualRefreshing,
    handleDelete,
    handleReindex,
    handleVisibilityChange,
    handleRebuildAll,
    handleManualRefresh,
  } = useDocumentManagement();

  if (allDocuments.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-app-section">My documents</h2>
          <span className="text-app-muted">{documentCountLabel(allDocuments.length)}</span>
        </div>
        <div className="text-muted-foreground py-12 text-center text-sm">
          No documents yet. Upload a file to get started.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center justify-between gap-3 sm:block">
          <h2 className="text-app-section">My documents</h2>
          <span className="text-app-muted sm:block">{documentCountLabel(allDocuments.length)}</span>
        </div>
        <Input
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="hidden md:block md:max-w-xs"
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          {rebuildProgress && (
            <span className="text-muted-foreground mr-auto text-sm sm:mr-0">
              Rebuilding {rebuildProgress.done}/{rebuildProgress.total}
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            title="Refresh documents"
            aria-label="Refresh documents"
          >
            <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
              <MoreHorizontal />
              <span className="sr-only">Open My documents actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={rebuilding} onClick={() => setRebuildDialogOpen(true)}>
                Rebuild All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Lang</TableHead>
            <TableHead className="hidden sm:table-cell">Chunks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Visibility</TableHead>
            <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                No documents match &ldquo;{search}&rdquo;
              </TableCell>
            </TableRow>
          )}
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              isDeleting={deletingId === doc.id}
              isReindexing={reindexingId === doc.id}
              isUpdatingVisibility={visibilityUpdatingId === doc.id}
              onReindex={handleReindex}
              onVisibilityChange={handleVisibilityChange}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </TableBody>
      </Table>

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        deleting={!!deletingId}
      />

      <RebuildDialog
        open={rebuildDialogOpen}
        onOpenChange={setRebuildDialogOpen}
        onConfirm={() => {
          setRebuildDialogOpen(false);
          handleRebuildAll();
        }}
        rebuilding={rebuilding}
      />
    </section>
  );
}
