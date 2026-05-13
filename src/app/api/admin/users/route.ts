import { NextResponse } from "next/server";
import { validationErrorResponse, withAdmin } from "@/lib/server/auth/api";
import { listUsers } from "@/lib/server/data/users";
import { createUserAccount } from "@/lib/server/services/create-user";
import { CreateUserInputSchema } from "@/lib/shared/schemas/user";

export const GET = withAdmin(async () => {
  const users = await listUsers();
  return NextResponse.json({ items: users });
});

export const POST = withAdmin(async (_actor, req) => {
  const parsed = CreateUserInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const user = await createUserAccount({ ...parsed.data, role: "user" });
  return NextResponse.json(user, { status: 201 });
});
