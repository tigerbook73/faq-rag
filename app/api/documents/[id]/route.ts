import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db/client';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.document.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
