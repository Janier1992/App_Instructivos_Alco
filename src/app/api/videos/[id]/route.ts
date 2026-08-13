import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { deleteProcessVideo } from '@/src/lib/processVideosStore';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;
  const deleted = await deleteProcessVideo(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Video eliminado.' });
}
