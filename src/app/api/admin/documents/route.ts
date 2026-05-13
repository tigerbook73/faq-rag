import { NextResponse } from "next/server";
import { validationErrorResponse, withAdmin } from "@/lib/server/auth/api";
import { listAdminDocuments } from "@/lib/server/data/documents";
import { AdminDocumentListQuerySchema } from "@/lib/shared/schemas/document";

export const GET = withAdmin(async (_actor, req) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = AdminDocumentListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { page, pageSize } = parsed.data;
  const { items, total } = await listAdminDocuments({ skip: (page - 1) * pageSize, take: pageSize });
  return NextResponse.json({ items, total, page, pageSize });
});
