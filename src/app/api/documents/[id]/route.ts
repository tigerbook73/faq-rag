import { NextResponse } from "next/server";
import { notFoundResponse, validationErrorResponse, withUser } from "@/lib/server/auth/api";
import { getDocumentForWrite, updateDocumentVisibilityForOwner } from "@/lib/server/data/documents";
import { deleteDocument } from "@/lib/server/services/delete-document";
import { UpdateDocumentInputSchema } from "@/lib/shared/schemas/document";

type P = { id: string };

export const PATCH = withUser<P>(async (actor, req, { params }) => {
  const { id } = await params;
  const parsed = UpdateDocumentInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const document = await updateDocumentVisibilityForOwner(actor.id, id, parsed.data.visibility);
  if (!document) return notFoundResponse();
  return NextResponse.json(document);
});

export const DELETE = withUser<P>(async (actor, _req, { params }) => {
  const { id } = await params;
  const doc = await getDocumentForWrite(actor, id);
  if (!doc) return notFoundResponse();
  await deleteDocument(id);
  return new NextResponse(null, { status: 204 });
});
