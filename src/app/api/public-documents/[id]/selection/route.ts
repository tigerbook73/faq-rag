import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { selectPublicDocumentForUser, unselectPublicDocumentForUser } from "@/lib/data/public-documents";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const selection = await selectPublicDocumentForUser(actor.id, id);
    if (!selection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(selection, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    await unselectPublicDocumentForUser(actor.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
