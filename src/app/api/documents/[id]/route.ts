import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, notFoundResponse, validationErrorResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";
import { getDocumentForWrite, updateDocumentVisibilityForOwner } from "@/lib/server/data/documents";
import { deleteDocument } from "@/lib/server/services/delete-document";
import { UpdateDocumentInputSchema } from "@/lib/shared/schemas/document";

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
      return notFoundResponse();
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
      return notFoundResponse();
    }

    await deleteDocument(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
