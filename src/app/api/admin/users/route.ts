import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/api";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listUsers } from "@/lib/data/users";
import { createUserAccount } from "@/lib/services/create-user";
import { createUserSchema } from "@/lib/validations/admin";

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
    const parsed = createUserSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const user = await createUserAccount({ ...parsed.data, role: "user" });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
