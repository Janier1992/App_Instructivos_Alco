import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireRole } from '@/src/lib/adminAuth';
import { deleteCustomRagDocument } from '@/src/lib/customRagStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  // Eliminar es una acción solo de Administrador (Editor puede crear/editar,
  // no eliminar).
  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const deleted = await deleteCustomRagDocument(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Documento PDF no encontrado en el store RAG.' }, { status: 404 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'document',
    entityId: id
  });

  return NextResponse.json({ success: true, message: 'Documento PDF eliminado del motor RAG.' });
}
