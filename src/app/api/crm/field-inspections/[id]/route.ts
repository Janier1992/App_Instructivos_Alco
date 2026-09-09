import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { updateFieldInspection, deleteFieldInspections, FieldInspectionInput } from '@/src/lib/fieldInspectionsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body: FieldInspectionInput = await request.json();

  const result = await updateFieldInspection(id, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo actualizar la inspección.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'field_inspection',
    entityId: id,
    metadata: { op: body.op, estado: body.estado }
  });

  return NextResponse.json({ success: true, inspection: result.inspection });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteFieldInspections([id]);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar la inspección.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'field_inspection',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
