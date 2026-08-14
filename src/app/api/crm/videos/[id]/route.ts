import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireRole } from '@/src/lib/adminAuth';
import { deleteProcessVideo } from '@/src/lib/processVideosStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const deleted = await deleteProcessVideo(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'video',
    entityId: id
  });

  return NextResponse.json({ success: true, message: 'Video eliminado.' });
}
