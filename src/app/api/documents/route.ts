import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, validationErrorResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";
import { listDocumentsPageForOwner } from "@/lib/server/data/documents";
import { DocumentListQuerySchema } from "@/lib/shared/schemas/document";

export async function GET(req: NextRequest) {
  try {
    const actor = await requireUser();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = DocumentListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const { page, pageSize } = parsed.data;
    const skip = (page - 1) * pageSize;

    const { items, total } = await listDocumentsPageForOwner(actor.id, { skip, take: pageSize });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return authErrorResponse(error);
  }
}
