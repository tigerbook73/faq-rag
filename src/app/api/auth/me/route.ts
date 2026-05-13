import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    return authErrorResponse(error);
  }
}
