import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireRole } from '@/src/lib/adminAuth';
import { reviewSelfCertification, updateSelfCertification, deleteSelfCertification } from '@/src/lib/selfCertificationsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// Dos usos distintos en el mismo PATCH, según qué campos traiga el body:
// - reviewNote: anotación de auditoría de Calidad, nunca toca lo que el
//   colaborador certificó (ver reviewSelfCertification).
// - orderReference/collaboratorName/results/notes: corrección real del
//   contenido, para cuando Calidad necesita arreglar un error de
//   digitación del Supervisor (ver updateSelfCertification).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();

  if (body.reviewNote !== undefined && body.orderReference === undefined && body.collaboratorName === undefined && body.results === undefined) {
    const result = await reviewSelfCertification(id, auth.session.sub, body.reviewNote);
    if (!result.success) {
      return NextResponse.json({ error: 'No se pudo registrar la revisión.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'update',
      entityType: 'self_certification',
      entityId: id,
      metadata: { reviewNote: body.reviewNote?.trim() || undefined }
    });

    return NextResponse.json({ success: true });
  }

  const { orderReference, collaboratorName, results, notes } = body;
  const result = await updateSelfCertification(id, { orderReference, collaboratorName, results, notes });
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo guardar la corrección.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'self_certification',
    entityId: id,
    metadata: { corrected: true }
  });

  return NextResponse.json({ success: true, certification: result.certification });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteSelfCertification(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar el registro.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'self_certification',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
