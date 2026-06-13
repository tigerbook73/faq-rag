import { NextResponse } from "next/server";
import { notFoundResponse, withUser } from "@/lib/server/auth/api";
import { getDocumentForWrite } from "@/lib/server/data/documents";
import { deleteDocument } from "@/lib/server/services/delete-document";

type P = { id: string };

export const DELETE = withUser<P>(async (actor, _req, { params }) => {
  const { id } = await params;
  const doc = await getDocumentForWrite(actor, id);
  if (!doc) return notFoundResponse();
  await deleteDocument(id);
  return new NextResponse(null, { status: 204 });
});
