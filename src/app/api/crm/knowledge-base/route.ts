import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { createDraftKnowledgeDocument, getKnowledgeDocuments } from '@/src/lib/knowledgeBaseStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// La extracción (texto + visión de Gemini en páginas con poco texto) puede
// tardar varios minutos en documentos largos — un PDF real de prueba con
// 60 páginas y 29 con diagramas tomó cerca de esto en lotes de 5 páginas
// en paralelo. Vercel limita este valor según el plan del proyecto; en
// planes con tope de 60s, documentos muy largos pueden no alcanzar a
// completarse en una sola subida.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const documents = await getKnowledgeDocuments(processSlug);
  return NextResponse.json({ success: true, documents });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    // El PDF ya se subió directo a Supabase Storage desde el navegador con
    // una signed upload URL (ver /api/crm/knowledge-base/upload-url) — esto
    // esquiva por completo el límite de tamaño por request de Vercel. Aquí
    // solo se recibe JSON con la referencia al archivo.
    const body = await request.json();
    const { processSlug, title, fileName, fileSize, storagePath } = body;

    if (!processSlug || !title?.trim()) {
      return NextResponse.json({ error: 'Se requiere processSlug y título.' }, { status: 400 });
    }
    if (!fileName || !storagePath || !fileSize) {
      return NextResponse.json({ error: 'Faltan datos del archivo cargado.' }, { status: 400 });
    }

    const result = await createDraftKnowledgeDocument({
      processSlug,
      title,
      fileName,
      fileSize,
      storagePath,
      createdBy: auth.session.sub
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo procesar el PDF.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'knowledge_document',
      entityId: result.document?.id,
      metadata: { processSlug, title: title.trim(), visionPagesUsed: result.document?.visionPagesUsed }
    });

    return NextResponse.json({ success: true, document: result.document });
  } catch (err: any) {
    console.error('Error creando documento de Base de Conocimiento:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
