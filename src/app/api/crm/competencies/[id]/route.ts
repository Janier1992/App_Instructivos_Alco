import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { deleteCompetency } from '@/src/lib/collaboratorCompetenciesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteCompetency(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'collaborator_competency',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
