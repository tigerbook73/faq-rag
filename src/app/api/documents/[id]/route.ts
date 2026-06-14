import { NextRequest, NextResponse } from "next/server";
import { notFoundResponse } from "@/lib/server/api";
import { getDocumentForWrite } from "@/lib/server/data/documents";
import { deleteDocument } from "@/lib/server/services/delete-document";

type P = { id: string };

export async function DELETE(_req: NextRequest, { params }: { params: Promise<P> }) {
  const { id } = await params;
  const doc = await getDocumentForWrite(id);
  if (!doc) return notFoundResponse();
  await deleteDocument(id);
  return new NextResponse(null, { status: 204 });
}
