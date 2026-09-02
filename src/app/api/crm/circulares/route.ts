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
    const contentType = request.headers.get('content-type') || '';

    let title: string;
    let bodyText: string;
    let processSlugsRaw: string;
    let displayOrderRaw: string | null;
    let embedUrlRaw: string;
    let attachment: { fileBuffer: Buffer; fileName: string; contentType: string } | undefined;
    let preUploadedAttachment: { storagePath: string; fileName: string; contentType: string } | undefined;

    if (contentType.includes('application/json')) {
      // Adjunto grande: el navegador ya lo subió directo a Supabase Storage
      // con una signed upload URL (ver /api/crm/circulares/upload-url) para
      // esquivar el límite de 4.5 MB por request de las funciones serverless
      // de Vercel.
      const body = await request.json();
      title = body.title || '';
      bodyText = body.bodyText || '';
      processSlugsRaw = body.processSlugs ? JSON.stringify(body.processSlugs) : '[]';
      displayOrderRaw = body.displayOrder !== undefined && body.displayOrder !== null ? String(body.displayOrder) : null;
      embedUrlRaw = (body.embedUrl || '').trim();

      if (body.attachmentStoragePath && body.attachmentFileName) {
        preUploadedAttachment = {
          storagePath: body.attachmentStoragePath,
          fileName: body.attachmentFileName,
          contentType: body.attachmentContentType || 'application/octet-stream'
        };
      }
    } else {
      const formData = await request.formData();
      title = (formData.get('title') as string) || '';
      bodyText = (formData.get('bodyText') as string) || '';
      processSlugsRaw = (formData.get('processSlugs') as string) || '[]';
      displayOrderRaw = formData.get('displayOrder') as string | null;
      embedUrlRaw = ((formData.get('embedUrl') as string) || '').trim();
      const file = formData.get('attachment');

      if (file && file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        attachment = {
          fileBuffer: Buffer.from(arrayBuffer),
          fileName: file.name,
          contentType: file.type || 'application/octet-stream'
        };
      }
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
      attachment,
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
