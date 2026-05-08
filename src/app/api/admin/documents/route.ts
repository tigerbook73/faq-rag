import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, validationErrorResponse } from "@/lib/auth/api";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminDocuments } from "@/lib/data/documents";
import { AdminDocumentListQuerySchema } from "@/lib/schemas/document";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = AdminDocumentListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const { page, pageSize } = parsed.data;
    const { items, total } = await listAdminDocuments({ skip: (page - 1) * pageSize, take: pageSize });
    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
