import { NextRequest, NextResponse } from "next/server";
import { UpdateSessionInputSchema } from "@/lib/shared/schemas/session";
import { authErrorResponse, validationErrorResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";
import { deleteSessionForUser, getSessionForUser, upsertSessionForUser } from "@/lib/server/data/sessions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const session = await getSessionForUser(actor.id, id);
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(session);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const parsed = UpdateSessionInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const session = await upsertSessionForUser(actor.id, id, parsed.data);
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(session);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    await deleteSessionForUser(actor.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
