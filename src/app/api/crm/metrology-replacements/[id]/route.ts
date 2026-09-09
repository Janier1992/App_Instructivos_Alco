import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { updateMetrologyReplacement, deleteMetrologyReplacement, MetrologyReplacementInput } from '@/src/lib/metrologyReplacementsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body: MetrologyReplacementInput = await request.json();

  const result = await updateMetrologyReplacement(id, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo actualizar el registro.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'metrology_replacement',
    entityId: id,
    metadata: { equipo: body.nombreEquipo }
  });

  return NextResponse.json({ success: true, replacement: result.replacement });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteMetrologyReplacement(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar el registro.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'metrology_replacement',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
