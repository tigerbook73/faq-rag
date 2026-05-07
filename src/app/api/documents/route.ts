import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { listDocumentsPageForOwner } from "@/lib/data/documents";
import { DocumentListQuerySchema } from "@/lib/schemas/document";

export async function GET(req: NextRequest) {
  try {
    const actor = await requireUser();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = DocumentListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { page, pageSize } = parsed.data;
    const skip = (page - 1) * pageSize;

    const { items, total } = await listDocumentsPageForOwner(actor.id, { skip, take: pageSize });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
