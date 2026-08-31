import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession, requireRole } from '@/src/lib/adminAuth';
import { updateImprovementStatus, deleteImprovement, ImprovementStatus } from '@/src/lib/processImprovementsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

const VALID_STATUSES: ImprovementStatus[] = ['proposed', 'in_review', 'implemented', 'rejected'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const { status, adminNote } = await request.json();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status debe ser uno de: ${VALID_STATUSES.join(', ')}.` }, { status: 400 });
    }

    const result = await updateImprovementStatus(id, status, auth.session.sub, adminNote);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo actualizar la propuesta.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'update',
      entityType: 'improvement',
      entityId: id,
      metadata: { status, processSlug: result.improvement!.processSlug, title: result.improvement!.title }
    });

    return NextResponse.json({ success: true, improvement: result.improvement });
  } catch (err: any) {
    console.error('Error actualizando propuesta de mejora:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

// Eliminar es solo de Administrador, igual que el resto de acciones de eliminar en el CRM.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const deleted = await deleteImprovement(id);
  if (!deleted) {
    return NextResponse.json({ error: 'No se pudo eliminar la propuesta.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'improvement',
    entityId: id
  });

  return NextResponse.json({ success: true, message: 'Propuesta eliminada.' });
}
