import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/auth/api";
import { listSelectablePublicDocuments } from "@/lib/server/data/public-documents";

export const GET = withUser(async (actor) => {
  const items = await listSelectablePublicDocuments(actor.id);
  return NextResponse.json({ items });
});
