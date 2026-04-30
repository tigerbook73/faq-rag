import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { page, pageSize } = listSchema.parse(params);
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
    prisma.document.count(),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
