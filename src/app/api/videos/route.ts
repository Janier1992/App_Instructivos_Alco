import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getProcessVideos } from '@/src/lib/processVideosStore';

// Solo lectura — pública, igual que GET /api/rag/documents. Agregar/eliminar
// videos se hace desde el Portal de Administración (/api/crm/videos).
export async function GET(request: NextRequest) {
  await ensureHydrated();
  const processSlug = request.nextUrl.searchParams.get('processSlug');

  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere el parámetro processSlug.' }, { status: 400 });
  }

  const videos = getProcessVideos(processSlug);
  return NextResponse.json({ success: true, videos, total: videos.length });
}
