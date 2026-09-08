import { NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getCircularById, getCircularAttachmentBuffer, getCircularAttachmentPlaybackUrl } from '@/src/lib/circularesStore';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;
  const circular = getCircularById(id);

  // Solo se sirve el adjunto si la circular está publicada — evita que un
  // borrador sea accesible adivinando el id.
  if (!circular || circular.status !== 'published') {
    return NextResponse.json({ error: 'Adjunto no encontrado.' }, { status: 404 });
  }

  // Video: redirige a una URL firmada de Storage en vez de descargar el
  // archivo completo aquí — mismo patrón que /api/videos/[id]/file.
  if ((circular.attachmentContentType || '').startsWith('video/')) {
    const playbackUrl = await getCircularAttachmentPlaybackUrl(circular);
    if (!playbackUrl) {
      return NextResponse.json({ error: 'No se pudo generar el enlace de reproducción del video.' }, { status: 404 });
    }
    return NextResponse.redirect(playbackUrl);
  }

  const buffer = await getCircularAttachmentBuffer(circular);
  if (!buffer) {
    return NextResponse.json({ error: 'Esta circular no tiene un archivo adjunto.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': circular.attachmentContentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(circular.attachmentFileName || 'adjunto')}"`
    }
  });
}
