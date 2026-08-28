import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { addProcessVideo, addUploadedProcessVideo, MAX_UPLOADED_VIDEO_BYTES } from '@/src/lib/processVideosStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { processSlug, title } = body;

    if (!processSlug || !title) {
      return NextResponse.json({ error: 'Se requiere processSlug y title.' }, { status: 400 });
    }

    // Archivo ya subido por el navegador directo a Storage (ver
    // /api/crm/videos/upload-url) — aquí solo se registra el metadato.
    if (body.docId && body.storagePath && body.fileName && body.fileSize) {
      if (body.fileSize > MAX_UPLOADED_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `El video supera el máximo permitido de ${Math.round(MAX_UPLOADED_VIDEO_BYTES / (1024 * 1024))} MB.` },
          { status: 400 }
        );
      }

      const { video, persistedToSupabase } = await addUploadedProcessVideo(
        processSlug,
        title,
        body.fileName,
        body.fileSize,
        body.storagePath
      );

      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'create',
        entityType: 'video',
        entityId: video.id,
        metadata: { processSlug, title: video.title, sourceType: 'upload' }
      });

      return NextResponse.json({ success: true, video, persistedToSupabase });
    }

    const { videoUrl } = body;
    if (!videoUrl) {
      return NextResponse.json({ error: 'Se requiere videoUrl, o los datos del archivo subido.' }, { status: 400 });
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
      metadata: { processSlug, title: video.title, sourceType: 'link' }
    });

    return NextResponse.json({ success: true, video, persistedToSupabase });
  } catch (err: any) {
    console.error('Error agregando video de proceso:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
