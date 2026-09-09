import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { updateMetrologyCalibration, deleteMetrologyCalibration, MetrologyCalibrationInput } from '@/src/lib/metrologyCalibrationsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body: MetrologyCalibrationInput = await request.json();

  const result = await updateMetrologyCalibration(id, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo actualizar el instrumento.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'metrology_calibration',
    entityId: id,
    metadata: { tool: body.tool, status: body.status }
  });

  return NextResponse.json({ success: true, calibration: result.calibration });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteMetrologyCalibration(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar el instrumento.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'metrology_calibration',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
