import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getProcessVideos, addProcessVideo } from '@/src/lib/processVideosStore';

export async function GET(request: NextRequest) {
  await ensureHydrated();
  const processSlug = request.nextUrl.searchParams.get('processSlug');

  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere el parámetro processSlug.' }, { status: 400 });
  }

  const videos = getProcessVideos(processSlug);
  return NextResponse.json({ success: true, videos, total: videos.length });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const { processSlug, title, videoUrl } = await request.json();

    if (!processSlug || !title || !videoUrl) {
      return NextResponse.json({ error: 'Se requiere processSlug, title y videoUrl.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(videoUrl);
    } catch {
      return NextResponse.json({ error: 'El enlace del video no es una URL válida.' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return NextResponse.json({ error: 'El enlace del video debe ser http o https.' }, { status: 400 });
    }

    const { video, persistedToSupabase } = await addProcessVideo(processSlug, title, videoUrl);
    return NextResponse.json({ success: true, video, persistedToSupabase });
  } catch (err: any) {
    console.error('Error agregando video de proceso:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
