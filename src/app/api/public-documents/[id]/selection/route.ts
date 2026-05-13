import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, notFoundResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";
import { selectPublicDocumentForUser, unselectPublicDocumentForUser } from "@/lib/server/data/public-documents";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const selection = await selectPublicDocumentForUser(actor.id, id);
    if (!selection) {
      return notFoundResponse();
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
