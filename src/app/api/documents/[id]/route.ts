import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { deleteDocumentById, getDocumentForWrite } from "@/lib/data/documents";
import { deleteUploadedFile } from "@/lib/storage";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const doc = await getDocumentForWrite(actor, id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (doc.fileRef) {
      await deleteUploadedFile(doc.fileRef).catch(() => {});
    }

    await deleteDocumentById(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
