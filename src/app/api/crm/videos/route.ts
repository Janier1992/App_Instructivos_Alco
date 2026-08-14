import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { addProcessVideo } from '@/src/lib/processVideosStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

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

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'video',
      entityId: video.id,
      metadata: { processSlug, title: video.title }
    });

    return NextResponse.json({ success: true, video, persistedToSupabase });
  } catch (err: any) {
    console.error('Error agregando video de proceso:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
