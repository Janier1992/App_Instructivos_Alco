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

  const circulares = getAllCircularesForAdmin();
  return NextResponse.json({ success: true, circulares, total: circulares.length });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const formData = await request.formData();
    const title = (formData.get('title') as string) || '';
    const bodyText = (formData.get('bodyText') as string) || '';
    const processSlugsRaw = (formData.get('processSlugs') as string) || '[]';
    const displayOrderRaw = formData.get('displayOrder') as string | null;
    const file = formData.get('attachment');

    if (!title.trim()) {
      return NextResponse.json({ error: 'Se requiere un título.' }, { status: 400 });
    }

    let processSlugs: string[] = [];
    try {
      processSlugs = JSON.parse(processSlugsRaw);
      if (!Array.isArray(processSlugs)) throw new Error();
    } catch {
      return NextResponse.json({ error: 'processSlugs debe ser un arreglo JSON de slugs.' }, { status: 400 });
    }

    let attachment: { fileBuffer: Buffer; fileName: string; contentType: string } | undefined;
    if (file && file instanceof File && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      attachment = {
        fileBuffer: Buffer.from(arrayBuffer),
        fileName: file.name,
        contentType: file.type || 'application/octet-stream'
      };
    }

    const displayOrder = displayOrderRaw !== null && displayOrderRaw !== '' ? Number(displayOrderRaw) : 0;

    const result = await createCircular({
      title,
      bodyText,
      processSlugs,
      createdBy: auth.session.sub,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      attachment
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
