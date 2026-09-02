import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import {
  getKnowledgeDocumentById,
  updateKnowledgeDocumentMarkdown,
  publishKnowledgeDocument,
  unpublishKnowledgeDocument,
  deleteKnowledgeDocument
} from '@/src/lib/knowledgeBaseStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// Publicar fragmenta y embebe el Markdown completo — puede tardar igual que
// la subida inicial en documentos largos.
export const maxDuration = 300;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const document = await getKnowledgeDocumentById(id);
  if (!document) {
    return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, document });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const { markdownContent, publish, unpublish } = await request.json();

    if (typeof markdownContent === 'string') {
      const saveResult = await updateKnowledgeDocumentMarkdown(id, markdownContent);
      if (!saveResult.success) {
        return NextResponse.json({ error: saveResult.error || 'No se pudo guardar.' }, { status: 500 });
      }
    }

    if (unpublish === true) {
      const result = await unpublishKnowledgeDocument(id);
      if (!result.success) {
        return NextResponse.json({ error: 'No se pudo despublicar el documento.' }, { status: 500 });
      }
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'update',
        entityType: 'knowledge_document',
        entityId: id,
        metadata: { status: 'draft' }
      });
      const document = await getKnowledgeDocumentById(id);
      return NextResponse.json({ success: true, document });
    }

    if (publish === true) {
      const result = await publishKnowledgeDocument(id);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'No se pudo publicar el documento.' }, { status: 500 });
      }
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'update',
        entityType: 'knowledge_document',
        entityId: id,
        metadata: { status: 'published', chunkCount: result.document?.chunkCount }
      });
      return NextResponse.json({ success: true, document: result.document });
    }

    const document = await getKnowledgeDocumentById(id);
    return NextResponse.json({ success: true, document });
  } catch (err: any) {
    console.error('Error actualizando documento de Base de Conocimiento:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteKnowledgeDocument(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar el documento.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'knowledge_document',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
