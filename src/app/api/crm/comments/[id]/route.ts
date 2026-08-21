import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { reviewComment } from '@/src/lib/commentsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const { status } = await request.json();
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status debe ser "approved" o "rejected".' }, { status: 400 });
    }

    const result = await reviewComment(id, status, auth.session.sub);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo actualizar el comentario.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: status === 'approved' ? 'approve' : 'reject',
      entityType: 'comment',
      entityId: id,
      metadata: { circularId: result.comment!.circularId, authorName: result.comment!.authorName }
    });

    return NextResponse.json({ success: true, comment: result.comment });
  } catch (err: any) {
    console.error('Error moderando comentario:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
