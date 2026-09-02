import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { getAllCircularesForAdmin, createCircular } from '@/src/lib/circularesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const circulares = await getAllCircularesForAdmin();
  return NextResponse.json({ success: true, circulares, total: circulares.length });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    // El adjunto (si lo hay) ya se subió directo a Supabase Storage desde el
    // navegador con una signed upload URL (ver
    // /api/crm/circulares/upload-url) — esto esquiva por completo el límite
    // de tamaño por request de las funciones serverless de Vercel. Aquí solo
    // se recibe JSON con la referencia al archivo, nunca el archivo en sí.
    const body = await request.json();
    const title: string = body.title || '';
    const bodyText: string = body.bodyText || '';
    const processSlugsRaw: string = body.processSlugs ? JSON.stringify(body.processSlugs) : '[]';
    const displayOrderRaw: string | null =
      body.displayOrder !== undefined && body.displayOrder !== null ? String(body.displayOrder) : null;
    const embedUrlRaw: string = (body.embedUrl || '').trim();

    let preUploadedAttachment: { storagePath: string; fileName: string; contentType: string } | undefined;
    if (body.attachmentStoragePath && body.attachmentFileName) {
      preUploadedAttachment = {
        storagePath: body.attachmentStoragePath,
        fileName: body.attachmentFileName,
        contentType: body.attachmentContentType || 'application/octet-stream'
      };
    }

    if (!title.trim()) {
      return NextResponse.json({ error: 'Se requiere un título.' }, { status: 400 });
    }

    if (embedUrlRaw) {
      try {
        const parsed = new URL(embedUrlRaw);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
      } catch {
        return NextResponse.json({ error: 'El enlace embebible no es una URL http/https válida.' }, { status: 400 });
      }
    }

    let processSlugs: string[] = [];
    try {
      processSlugs = JSON.parse(processSlugsRaw);
      if (!Array.isArray(processSlugs)) throw new Error();
    } catch {
      return NextResponse.json({ error: 'processSlugs debe ser un arreglo JSON de slugs.' }, { status: 400 });
    }

    const displayOrder = displayOrderRaw !== null && displayOrderRaw !== '' ? Number(displayOrderRaw) : 0;

    const result = await createCircular({
      title,
      bodyText,
      processSlugs,
      createdBy: auth.session.sub,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      embedUrl: embedUrlRaw || undefined,
      preUploadedAttachment
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo crear la circular.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'circular',
      entityId: result.circular!.id,
      metadata: { title: result.circular!.title, processSlugs }
    });

    return NextResponse.json({ success: true, circular: result.circular });
  } catch (err: any) {
    console.error('Error creando circular:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
