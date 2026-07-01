import { NextRequest, NextResponse } from "next/server";
import { validationErrorResponse } from "@/lib/server/api";
import { listDocumentsPage } from "@/lib/server/data/documents";
import { DocumentListQuerySchema } from "@/lib/shared/schemas/document";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = DocumentListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;
  const { items, total } = await listDocumentsPage({ skip, take: pageSize });
  return NextResponse.json({ items, total, page, pageSize });
}
