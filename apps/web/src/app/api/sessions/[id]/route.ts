import { NextRequest, NextResponse } from "next/server";
import { UpdateSessionInputSchema } from "@/lib/shared/schemas/session";
import { notFoundResponse, validationErrorResponse } from "@/lib/server/api";
import { deleteSession, getSession, upsertSession } from "@/lib/server/data/sessions";

type P = { id: string };

export async function GET(_req: NextRequest, { params }: { params: Promise<P> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return notFoundResponse();
  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<P> }) {
  const { id } = await params;
  const parsed = UpdateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const session = await upsertSession(id, parsed.data);
  if (!session) return notFoundResponse();
  return NextResponse.json(session);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<P> }) {
  const { id } = await params;
  await deleteSession(id);
  return new NextResponse(null, { status: 204 });
}
