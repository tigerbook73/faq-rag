import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, validationErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { getDocumentForWrite, updateDocumentVisibilityForOwner } from "@/lib/data/documents";
import { deleteDocument } from "@/lib/services/delete-document";
import { UpdateDocumentInputSchema } from "@/lib/schemas/document";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const parsed = UpdateDocumentInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const document = await updateDocumentVisibilityForOwner(actor.id, id, parsed.data.visibility);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const doc = await getDocumentForWrite(actor, id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await deleteDocument(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
