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
import { KnowledgeSectionTitle } from "@/components/knowledge/KnowledgeSectionTitle";

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
        <KnowledgeSectionTitle title="My documents" count={allDocuments.length} />
        <div className="text-muted-foreground py-12 text-center text-sm">
          No documents yet. Upload a file to get started.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 space-y-0 space-y-2">
        <KnowledgeSectionTitle title="My documents" count={allDocuments.length} />
        <Input
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="hidden md:block md:max-w-xs"
        />
        <div className="flex-1" />
        <div className="flex items-center gap-2 md:ml-auto">
          {rebuildProgress && (
            <span className="text-muted-foreground mr-auto text-sm md:mr-0">
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
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Lang</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Visibility</TableHead>
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
