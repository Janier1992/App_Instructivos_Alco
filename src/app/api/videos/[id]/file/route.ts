import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getProcessVideoById, getVideoPlaybackUrl } from '@/src/lib/processVideosStore';

/**
 * Redirige a una URL firmada de corta duración del bucket privado de
 * Storage, en vez de descargar el archivo aquí y reenviarlo — así el video
 * lo sirve Supabase/S3 directamente, con soporte real de "Range" requests
 * para poder adelantar/retroceder, sin pasar por los límites de memoria y
 * duración de esta función serverless.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;

  const video = await getProcessVideoById(id);
  if (!video) {
    return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
  }

  const playbackUrl = await getVideoPlaybackUrl(video);
  if (!playbackUrl) {
    return NextResponse.json({ error: 'No se pudo generar el enlace de reproducción del video.' }, { status: 404 });
  }

  return NextResponse.redirect(playbackUrl);
}
