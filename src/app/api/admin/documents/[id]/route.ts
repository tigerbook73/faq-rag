import { NextResponse } from "next/server";
import { notFoundResponse, withAdmin } from "@/lib/server/auth/api";
import { deleteDocument } from "@/lib/server/services/delete-document";

export const DELETE = withAdmin<{ id: string }>(async (_actor, _req, { params }) => {
  const { id } = await params;
  const document = await deleteDocument(id);
  if (!document) return notFoundResponse();
  return new NextResponse(null, { status: 204 });
});
