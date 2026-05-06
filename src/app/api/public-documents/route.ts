import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { listSelectablePublicDocuments } from "@/lib/data/public-documents";

export async function GET() {
  try {
    const actor = await requireUser();
    const items = await listSelectablePublicDocuments(actor.id);
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error);
  }
}
