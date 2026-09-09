import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { updateNonConformityStatus } from '@/src/lib/nonConformitiesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { status } = await request.json();
  if (!status?.trim()) {
    return NextResponse.json({ error: 'Se requiere el estado.' }, { status: 400 });
  }

  const result = await updateNonConformityStatus(id, status);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo actualizar el estado.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'non_conformity',
    entityId: id,
    metadata: { status }
  });

  return NextResponse.json({ success: true });
}
