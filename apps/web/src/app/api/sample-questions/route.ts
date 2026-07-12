import { NextResponse } from "next/server";
import { listSampleQuestions } from "@/lib/server/data/sample-questions";

export async function GET() {
  const items = await listSampleQuestions();
  return NextResponse.json({ items });
}
