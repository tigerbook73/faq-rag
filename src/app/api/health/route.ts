import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db/client";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database unavailable",
        error: err instanceof Error ? { ...err, name: err.name, message: err.message } : err,
      },
      { status: 503 }
    );
  }
}
