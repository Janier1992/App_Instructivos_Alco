import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { setShiftCheckItemActive, deleteShiftCheckItem } from '@/src/lib/shiftChecksStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { active } = await request.json();

  if (typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Se requiere active (booleano).' }, { status: 400 });
  }

  const result = await setShiftCheckItemActive(id, active);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo actualizar el ítem.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'shift_check_item',
    entityId: id,
    metadata: { active }
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteShiftCheckItem(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar el ítem.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'shift_check_item',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
