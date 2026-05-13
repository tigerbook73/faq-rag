import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, validationErrorResponse } from "@/lib/server/auth/api";
import { requireAdmin } from "@/lib/server/auth/require-admin";
import { listUsers } from "@/lib/server/data/users";
import { createUserAccount } from "@/lib/server/services/create-user";
import { CreateUserInputSchema } from "@/lib/shared/schemas/user";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsers();
    return NextResponse.json({ items: users });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = CreateUserInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const user = await createUserAccount({ ...parsed.data, role: "user" });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
