import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/api";
import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteDocument } from "@/lib/services/delete-document";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const document = await deleteDocument(id);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
