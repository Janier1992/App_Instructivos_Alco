import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { deleteInspectionForm, updateInspectionFormRecordsUrl } from '@/src/lib/inspectionFormsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { recordsEmbedUrl } = await request.json();

  if (typeof recordsEmbedUrl !== 'string') {
    return NextResponse.json({ error: 'Se requiere recordsEmbedUrl (texto).' }, { status: 400 });
  }

  const result = await updateInspectionFormRecordsUrl(id, recordsEmbedUrl);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo actualizar.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'inspection_form',
    entityId: id,
    metadata: { recordsEmbedUrl: recordsEmbedUrl.trim() }
  });

  return NextResponse.json({ success: true, form: result.form });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteInspectionForm(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar el formulario.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'inspection_form',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
