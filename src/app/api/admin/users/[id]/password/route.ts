import { NextResponse } from "next/server";
import { validationErrorResponse, withAdmin } from "@/lib/server/auth/api";
import { updateUserPassword } from "@/lib/server/services/update-user-password";
import { UpdatePasswordInputSchema } from "@/lib/shared/schemas/user";

export const PATCH = withAdmin<{ id: string }>(async (_actor, req, { params }) => {
  const { id } = await params;
  const parsed = UpdatePasswordInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const result = await updateUserPassword(id, parsed.data.password);
  if (!result.found) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
});
