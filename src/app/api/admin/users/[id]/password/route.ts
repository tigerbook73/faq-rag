import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth/api";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateUserPassword } from "@/lib/services/update-user-password";

const schema = z.object({ password: z.string().min(6) });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await updateUserPassword(id, parsed.data.password);
    if (!result.found) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
