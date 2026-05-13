import { NextResponse } from "next/server";
import { notFoundResponse, withUser } from "@/lib/server/auth/api";
import { selectPublicDocumentForUser, unselectPublicDocumentForUser } from "@/lib/server/data/public-documents";

type P = { id: string };

export const POST = withUser<P>(async (actor, _req, { params }) => {
  const { id } = await params;
  const selection = await selectPublicDocumentForUser(actor.id, id);
  if (!selection) return notFoundResponse();
  return NextResponse.json(selection, { status: 201 });
});

export const DELETE = withUser<P>(async (actor, _req, { params }) => {
  const { id } = await params;
  await unselectPublicDocumentForUser(actor.id, id);
  return new NextResponse(null, { status: 204 });
});
