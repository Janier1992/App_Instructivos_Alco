import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession, requireRole } from '@/src/lib/adminAuth';
import { updateCircular, deleteCircular } from '@/src/lib/circularesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, bodyText, processSlugs, status, displayOrder, embedUrl } = body;

    if (status !== undefined && status !== 'draft' && status !== 'published') {
      return NextResponse.json({ error: 'status debe ser "draft" o "published".' }, { status: 400 });
    }
    if (displayOrder !== undefined && typeof displayOrder !== 'number') {
      return NextResponse.json({ error: 'displayOrder debe ser un número.' }, { status: 400 });
    }
    if (embedUrl) {
      try {
        const parsed = new URL(embedUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
      } catch {
        return NextResponse.json({ error: 'El enlace embebible no es una URL http/https válida.' }, { status: 400 });
      }
    }

    const result = await updateCircular(id, { title, bodyText, processSlugs, status, displayOrder, embedUrl });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo actualizar la circular.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: status === 'published' ? 'publish' : status === 'draft' ? 'unpublish' : 'update',
      entityType: 'circular',
      entityId: id,
      metadata: { title: result.circular!.title, status: result.circular!.status }
    });

    return NextResponse.json({ success: true, circular: result.circular });
  } catch (err: any) {
    console.error('Error actualizando circular:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const deleted = await deleteCircular(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Circular no encontrada.' }, { status: 404 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'circular',
    entityId: id
  });

  return NextResponse.json({ success: true, message: 'Circular eliminada.' });
}
