import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth/api";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminDocuments } from "@/lib/data/documents";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize } = listSchema.parse(params);
    const { items, total } = await listAdminDocuments({ skip: (page - 1) * pageSize, take: pageSize });
    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
