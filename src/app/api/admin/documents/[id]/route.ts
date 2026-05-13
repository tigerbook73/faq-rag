import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, notFoundResponse } from "@/lib/server/auth/api";
import { requireAdmin } from "@/lib/server/auth/require-admin";
import { deleteDocument } from "@/lib/server/services/delete-document";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const document = await deleteDocument(id);
    if (!document) {
      return notFoundResponse();
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
