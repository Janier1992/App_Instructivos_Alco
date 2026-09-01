import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { updateChatFeedbackRootCause } from '@/src/lib/chatFeedbackStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const { rootCause } = await request.json();

    if (typeof rootCause !== 'string') {
      return NextResponse.json({ error: 'Se requiere rootCause (texto).' }, { status: 400 });
    }

    const result = await updateChatFeedbackRootCause(id, rootCause);
    if (!result.success) {
      return NextResponse.json({ error: 'No se pudo guardar la causa raíz.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'update',
      entityType: 'chat_feedback_root_cause',
      entityId: id,
      metadata: { rootCause }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error guardando causa raíz:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
