import { NextResponse } from "next/server";
import { notFoundResponse, withAdmin } from "@/lib/server/auth/api";
import { deleteUserAccount } from "@/lib/server/services/delete-user";

export const DELETE = withAdmin<{ id: string }>(async (actor, _req, { params }) => {
  const { id } = await params;
  if (id === actor.id) {
    return NextResponse.json({ error: "Admin cannot delete their own account" }, { status: 400 });
  }
  const user = await deleteUserAccount(id);
  if (!user) return notFoundResponse();
  return new NextResponse(null, { status: 204 });
});
