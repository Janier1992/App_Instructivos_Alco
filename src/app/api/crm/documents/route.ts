import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { processAndSavePdfDocument } from '@/src/lib/customRagStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

// Los PDF de manuales técnicos pueden tardar unos segundos en extraerse e
// indexarse (embeddings). Vercel Hobby permite hasta 60s de "maxDuration".
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const processSlug = (formData.get('processSlug') as string) || 'general';
    const title = (formData.get('title') as string) || undefined;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Se requiere un archivo PDF (campo "file").' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { document, persistedToSupabase, isDuplicate } = await processAndSavePdfDocument(
      buffer,
      file.name,
      file.size,
      processSlug,
      title
    );

    if (!isDuplicate) {
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'create',
        entityType: 'document',
        entityId: document.id,
        metadata: { processSlug, fileName: file.name, title: document.title }
      });
    }

    return NextResponse.json({
      success: true,
      message: isDuplicate
        ? `El documento "${file.name}" ya existe en la lista de documentos de este proceso.`
        : `PDF "${file.name}" procesado exitosamente y cargado al motor RAG.`,
      document,
      persistedToSupabase,
      isDuplicate
    });
  } catch (err: any) {
    console.error('Error al procesar PDF RAG:', err);
    return NextResponse.json({ error: err.message || 'Error al procesar el archivo PDF.' }, { status: 500 });
  }
}
