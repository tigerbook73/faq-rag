import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/server/auth/api";
import { listAdminDocuments } from "@/lib/server/data/documents";

export const GET = withAdmin(async (_actor, req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10));
  const skip = (page - 1) * pageSize;

  const { items, total } = await listAdminDocuments({ skip, take: pageSize });
  return NextResponse.json({ items, total, page, pageSize });
});
