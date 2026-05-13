import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, notFoundResponse } from "@/lib/server/auth/api";
import { requireAdmin } from "@/lib/server/auth/require-admin";
import { deleteUserAccount } from "@/lib/server/services/delete-user";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;

    if (id === actor.id) {
      return NextResponse.json({ error: "Admin cannot delete their own account" }, { status: 400 });
    }

    const user = await deleteUserAccount(id);
    if (!user) {
      return notFoundResponse();
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
