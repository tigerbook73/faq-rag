import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db/client";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ status: "error", message: String(err) }, { status: 503 });
  }
}
