import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";
import { listSelectablePublicDocuments } from "@/lib/server/data/public-documents";

export async function GET() {
  try {
    const actor = await requireUser();
    const items = await listSelectablePublicDocuments(actor.id);
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error);
  }
}
