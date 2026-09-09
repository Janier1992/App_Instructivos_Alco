import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { updateMetrologyDelivery, deleteMetrologyDelivery, MetrologyDeliveryInput } from '@/src/lib/metrologyDeliveriesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body: MetrologyDeliveryInput = await request.json();

  const result = await updateMetrologyDelivery(id, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo actualizar el acta de entrega.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'metrology_delivery',
    entityId: id,
    metadata: { receptor: body.receptorNombre }
  });

  return NextResponse.json({ success: true, delivery: result.delivery });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteMetrologyDelivery(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar el acta de entrega.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'metrology_delivery',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
