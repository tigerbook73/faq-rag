import { NextResponse } from "next/server";
import { UpdateSessionInputSchema } from "@/lib/shared/schemas/session";
import { notFoundResponse, validationErrorResponse, withUser } from "@/lib/server/auth/api";
import { deleteSessionForUser, getSessionForUser, upsertSessionForUser } from "@/lib/server/data/sessions";

type P = { id: string };

export const GET = withUser<P>(async (actor, _req, { params }) => {
  const { id } = await params;
  const session = await getSessionForUser(actor.id, id);
  if (!session) return notFoundResponse();
  return NextResponse.json(session);
});

export const PATCH = withUser<P>(async (actor, req, { params }) => {
  const { id } = await params;
  const parsed = UpdateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const session = await upsertSessionForUser(actor.id, id, parsed.data);
  if (!session) return notFoundResponse();
  return NextResponse.json(session);
});

export const DELETE = withUser<P>(async (actor, _req, { params }) => {
  const { id } = await params;
  await deleteSessionForUser(actor.id, id);
  return new NextResponse(null, { status: 204 });
});
