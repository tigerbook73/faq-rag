"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type PublicDocumentItem as PublicDocument } from "@/lib/schemas/document";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PublicDocumentTable() {
  const { data, mutate } = useSWR<{ items: PublicDocument[] }>(
    "/api/public-documents",
    fetcher,
  );
  const documents = useMemo(() => data?.items ?? [], [data]);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) => doc.name.toLowerCase().includes(q) || doc.owner.email.toLowerCase().includes(q));
  }, [documents, search]);

  async function handleSelectionChange(id: string, selected: boolean) {
    mutate(
      (current) =>
        current
          ? { items: current.items.map((doc) => (doc.id === id ? { ...doc, selected } : doc)) }
          : current,
      false,
    );
    setUpdatingId(id);

    try {
      const res = await fetch(`/api/public-documents/${id}/selection`, {
        method: selected ? "POST" : "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Selection update failed (${res.status})`);
      }
      await mutate();
    } catch (err) {
      await mutate();
      toast.error(err instanceof Error ? err.message : "Selection update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-app-section">Public documents</h2>
          <p className="text-app-muted">Select public documents from other users for retrieval.</p>
        </div>
        <Input
          placeholder="Search public documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:ml-auto sm:max-w-xs"
        />
      </div>

      {documents.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">No public documents are available.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Owner</TableHead>
              <TableHead className="hidden sm:table-cell">Lang</TableHead>
              <TableHead className="hidden md:table-cell">Chunks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Selection</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                  No public documents match &ldquo;{search}&rdquo;
                </TableCell>
              </TableRow>
            )}
            {filteredDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="max-w-36 truncate font-medium sm:max-w-64">{doc.name}</TableCell>
                <TableCell className="hidden sm:table-cell">{doc.owner.email}</TableCell>
                <TableCell className="hidden sm:table-cell">{doc.lang}</TableCell>
                <TableCell className="hidden md:table-cell">{doc._count.chunks}</TableCell>
                <TableCell>
                  <Badge>{doc.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={doc.selected ? "outline" : "default"}
                    size="sm"
                    disabled={updatingId === doc.id}
                    onClick={() => handleSelectionChange(doc.id, !doc.selected)}
                  >
                    {doc.selected ? "Selected" : "Select"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
