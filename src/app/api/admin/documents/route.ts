import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/server/auth/api";
import { listAdminDocuments } from "@/lib/server/data/documents";

export const GET = withAdmin(async () => {
  const { items, total } = await listAdminDocuments();
  return NextResponse.json({ items, total });
});
