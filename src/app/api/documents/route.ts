import { NextResponse } from "next/server";
import { validationErrorResponse, withUser } from "@/lib/server/auth/api";
import { listDocumentsPageForOwner } from "@/lib/server/data/documents";
import { DocumentListQuerySchema } from "@/lib/shared/schemas/document";

export const GET = withUser(async (actor, req) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = DocumentListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;
  const { items, total } = await listDocumentsPageForOwner(actor.id, { skip, take: pageSize });
  return NextResponse.json({ items, total, page, pageSize });
});
