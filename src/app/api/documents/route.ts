import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { listDocumentsPageForOwner } from "@/lib/data/documents";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const actor = await requireUser();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize } = listSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const { items, total } = await listDocumentsPageForOwner(actor.id, { skip, take: pageSize });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
