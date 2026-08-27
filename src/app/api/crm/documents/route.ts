import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { processAndSavePdfDocument, RagDocumentType } from '@/src/lib/customRagStore';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { recordAuditEvent } from '@/src/lib/auditLog';

const RAG_PDF_BUCKET = 'rag-pdfs';

// Los PDF de manuales técnicos pueden tardar unos segundos en extraerse e
// indexarse (embeddings). Vercel Hobby permite hasta 60s de "maxDuration".
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer;
    let fileName: string;
    let fileSize: number;
    let processSlug: string;
    let title: string | undefined;
    let documentType: RagDocumentType | undefined;
    let preUploaded: { docId: string; storagePath: string } | undefined;

    if (contentType.includes('application/json')) {
      // PDF grande: el navegador ya lo subió directo a Supabase Storage con
      // una signed upload URL (ver /api/crm/documents/upload-url) para
      // esquivar el límite de 4.5 MB por request de las funciones serverless
      // de Vercel. Aquí solo se descarga desde Storage para extraer el texto
      // y generar los embeddings — esa descarga no pasa por ese límite.
      const body = await request.json();
      const { docId, storagePath, fileName: fn, fileSize: fs, processSlug: ps, title: t, documentType: dt } = body;
      if (!docId || !storagePath || !fn || !fs) {
        return NextResponse.json({ error: 'Faltan datos del archivo cargado.' }, { status: 400 });
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return NextResponse.json({ error: 'Supabase no está configurado en el servidor.' }, { status: 500 });
      }
      const { data, error } = await supabase.storage.from(RAG_PDF_BUCKET).download(storagePath);
      if (error || !data) {
        return NextResponse.json({ error: 'No se pudo leer el archivo cargado desde Storage.' }, { status: 500 });
      }

      buffer = Buffer.from(await data.arrayBuffer());
      fileName = fn;
      fileSize = fs;
      processSlug = ps || 'general';
      title = t || undefined;
      documentType = (dt as RagDocumentType) || undefined;
      preUploaded = { docId, storagePath };
    } else {
      const formData = await request.formData();
      const file = formData.get('file');
      processSlug = (formData.get('processSlug') as string) || 'general';
      title = (formData.get('title') as string) || undefined;
      documentType = (formData.get('documentType') as RagDocumentType) || undefined;

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'Se requiere un archivo PDF (campo "file").' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      fileSize = file.size;
    }

    const { document, persistedToSupabase, isDuplicate } = await processAndSavePdfDocument(
      buffer,
      fileName,
      fileSize,
      processSlug,
      title,
      preUploaded,
      documentType
    );

    if (!isDuplicate) {
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'create',
        entityType: 'document',
        entityId: document.id,
        metadata: { processSlug, fileName, title: document.title }
      });
    }

    return NextResponse.json({
      success: true,
      message: isDuplicate
        ? `El documento "${fileName}" ya existe en la lista de documentos de este proceso.`
        : `PDF "${fileName}" procesado exitosamente y cargado al motor RAG.`,
      document,
      persistedToSupabase,
      isDuplicate
    });
  } catch (err: any) {
    console.error('Error al procesar PDF RAG:', err);
    return NextResponse.json({ error: err.message || 'Error al procesar el archivo PDF.' }, { status: 500 });
  }
}
