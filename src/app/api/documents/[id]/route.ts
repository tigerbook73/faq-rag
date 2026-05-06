import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { deleteDocumentById, getDocumentForWrite, updateDocumentVisibilityForOwner } from "@/lib/data/documents";
import { deleteUploadedFile } from "@/lib/storage";

const updateDocumentSchema = z.object({
  visibility: z.enum(["private", "public"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const parsed = updateDocumentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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

    if (doc.fileRef) {
      await deleteUploadedFile(doc.fileRef).catch(() => {});
    }

    await deleteDocumentById(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
