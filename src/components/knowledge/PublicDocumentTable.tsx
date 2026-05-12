"use client";

import { useMemo, useState } from "react";
import { Fragment } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KnowledgeSectionTitle } from "@/components/knowledge/KnowledgeSectionTitle";
import { type PublicDocumentItem as PublicDocument } from "@/lib/schemas/document";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function chunksLabel(count: number) {
  return `${count} chunk${count === 1 ? "" : "s"}`;
}

export function PublicDocumentTable() {
  const { data, mutate } = useSWR<{ items: PublicDocument[] }>("/api/public-documents", fetcher);
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
        current ? { items: current.items.map((doc) => (doc.id === id ? { ...doc, selected } : doc)) } : current,
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
      <div className="space-y-2 md:flex md:items-center md:gap-3 md:space-y-0">
        <KnowledgeSectionTitle title="Public documents" count={documents.length} />
        <Input
          placeholder="Search public documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="hidden md:ml-auto md:block md:max-w-xs"
        />
      </div>

      {documents.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">No public documents are available.</div>
      ) : (
        <Table>
          <TableHeader className="hidden md:table-header-group">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Lang</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead className="text-right">Use</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                  No public documents match &ldquo;{search}&rdquo;
                </TableCell>
              </TableRow>
            )}
            {filteredDocuments.map((doc) => (
              <Fragment key={doc.id}>
                <TableRow className="md:hidden">
                  <TableCell colSpan={5} className="whitespace-normal">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="truncate font-medium">{doc.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{doc.owner.email}</p>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span>{doc.lang}</span>
                          <span>{chunksLabel(doc._count.chunks)}</span>
                        </div>
                      </div>
                      <Switch
                        aria-label={`Use "${doc.name}" for retrieval`}
                        checked={doc.selected}
                        disabled={updatingId === doc.id}
                        onCheckedChange={(selected) => handleSelectionChange(doc.id, selected)}
                        className="mt-0.5 shrink-0"
                      />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow className="hidden md:table-row">
                  <TableCell className="max-w-64 truncate font-medium">{doc.name}</TableCell>
                  <TableCell>{doc.owner.email}</TableCell>
                  <TableCell>{doc.lang}</TableCell>
                  <TableCell>{doc._count.chunks}</TableCell>
                  <TableCell className="text-right">
                    <Switch
                      aria-label={`Use "${doc.name}" for retrieval`}
                      checked={doc.selected}
                      disabled={updatingId === doc.id}
                      onCheckedChange={(selected) => handleSelectionChange(doc.id, selected)}
                    />
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
