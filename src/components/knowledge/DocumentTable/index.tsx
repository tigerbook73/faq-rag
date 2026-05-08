"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDocumentManagement } from "./useDocumentManagement";
import { DocumentRow, type Document } from "@/components/knowledge/DocumentRow";
import { DeleteDialog, RebuildDialog } from "@/components/knowledge/DocumentDialogs";

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
        <div>
          <h2 className="text-app-section">My documents</h2>
          <p className="text-app-muted">Manage visibility, indexing, and deletion for your documents.</p>
        </div>
        <div className="text-muted-foreground py-12 text-center text-sm">No documents yet. Upload some files above.</div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-app-section">My documents</h2>
        <p className="text-app-muted">Manage visibility, indexing, and deletion for your documents.</p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            title="Refresh Table"
          >
            <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            disabled={rebuilding}
            onClick={() => setRebuildDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            {rebuildProgress ? `Rebuilding ${rebuildProgress.done}/${rebuildProgress.total}…` : "Rebuild All"}
          </Button>
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
