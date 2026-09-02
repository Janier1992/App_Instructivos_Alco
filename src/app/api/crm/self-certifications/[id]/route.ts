import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { reviewSelfCertification } from '@/src/lib/selfCertificationsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// Anotación de auditoría de Calidad sobre una autocertificación — nunca
// modifica los resultados que el colaborador certificó, solo deja
// constancia de que Calidad la revisó (y con qué observación, si aplica).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { reviewNote } = await request.json();

  const result = await reviewSelfCertification(id, auth.session.sub, reviewNote);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo registrar la revisión.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'update',
    entityType: 'self_certification',
    entityId: id,
    metadata: { reviewNote: reviewNote?.trim() || undefined }
  });

  return NextResponse.json({ success: true });
}
