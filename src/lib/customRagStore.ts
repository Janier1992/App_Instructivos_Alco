import { getSupabaseClient } from './supabaseService';
import { PROCESSES } from '../data/processesData';
import { embedAndStoreChunks } from './ragRetrieval';
import { CustomRagDocument, RagDocumentType, normalizeDocumentType } from './ragDocumentTypes';

const RAG_PDF_BUCKET = 'rag-pdfs';

// Re-exportados para no romper a quienes ya importaban estos símbolos desde
// customRagStore — la definición real vive en ragDocumentTypes.ts (sin
// dependencias de Node) para que los componentes cliente puedan importarlos
// sin arrastrar pdf-parse/@napi-rs/canvas al bundle del navegador.
export type { CustomRagDocument, RagDocumentType };
export { RAG_DOCUMENT_TYPE_ORDER, RAG_DOCUMENT_TYPE_LABELS } from './ragDocumentTypes';

// Memory store for loaded RAG PDFs
let customDocumentsStore: CustomRagDocument[] = [
  {
    id: 'pdf-default-01',
    fileName: 'Manual_Tecnico_Control_Calidad_Alco_2026.pdf',
    fileSize: 485200,
    processSlug: 'corte-perfileria',
    title: 'Manual Técnico de Tolerancias en Corte y Extrusión',
    code: 'PDF-TC-01',
    uploadedAt: new Date().toISOString(),
    extractedText: `MANUAL TÉCNICO DE CONTROL DE CALIDAD - CORTE Y EXTRUSIÓN ALCO S.A.S.
1. TOLERANCIAS Y ESPECIFICACIONES DIMENSIONALES EN CORTE
- Tolerancia longitudinal en tronzadora: ± 0.3 mm para líneas de alta gama (Alumak y Panorama) y ± 0.5 mm para líneas estándar.
- Inclinación máxima de inglete: 45° ± 0.15° en ensambles estructurales.
- Desahogo de condensación: Mínimo 2 perfiles de drenaje por cada metro lineal de alfardía.
- Flecha o curvatura máxima aceptada en perfiles de 6 metros: 0.8 mm por metro.
- Defecto critico: Rayas transversales con profundidad mayor a 20 micras en cara vista requieren descarte inmediato.
2. PROCEDIMIENTO DE ESCALAMIENTO Y AUDITORÍA
Cualquier desviación en la medición del ángulo mayor a 0.5° genera paro de máquina e inspección de calibración de disco de corte.`,
    pageCount: 3,
    chunkCount: 2,
    summary: 'Manual oficial de tolerancias dimensionales en tronzadoras y extrusión para perfiles Alco.',
    documentType: 'manual'
  }
];

export function getCustomRagDocuments(processSlug?: string): CustomRagDocument[] {
  if (!processSlug || processSlug === 'all') {
    return customDocumentsStore;
  }
  // Aislamiento estricto: el agente de un proceso solo debe consultar los
  // PDFs cargados específicamente a ese proceso, no los de "general" ni los
  // de otros procesos — evita que documentación de otra área se filtre en
  // las respuestas de un proceso distinto.
  return customDocumentsStore.filter(doc => doc.processSlug === processSlug);
}

/**
 * Igual que getCustomRagDocuments, pero recarga primero desde Supabase en
 * vez de servir la caché en memoria de esta instancia. Se usa en las vistas
 * de listado (panel admin, panel público, conteo del listado principal):
 * subir un PDF y listar pueden caer en instancias serverless distintas, cada
 * una hidratada en un momento diferente, y sin esto un documento recién
 * subido podía no aparecer aunque sí quedara guardado. No se usa en el
 * camino del chat (ragEngine.ts) para no sumarle una consulta a Supabase a
 * cada mensaje — ahí una caché con unos segundos de rezago es aceptable.
 */
export async function getCustomRagDocumentsFresh(processSlug?: string): Promise<CustomRagDocument[]> {
  await loadCustomRagDocumentsFromSupabase();
  return getCustomRagDocuments(processSlug);
}

export function getAllCustomRagDocuments(): CustomRagDocument[] {
  return customDocumentsStore;
}

export function getCustomRagDocumentById(id: string): CustomRagDocument | undefined {
  return customDocumentsStore.find(doc => doc.id === id);
}

/**
 * Descarga el archivo PDF original desde Supabase Storage. Devuelve null si el
 * documento no tiene archivo guardado (subido antes de esta funcionalidad) o
 * si Supabase no está configurado.
 */
export async function getPdfFileBuffer(doc: CustomRagDocument): Promise<Buffer | null> {
  if (!doc.storagePath) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage.from(RAG_PDF_BUCKET).download(doc.storagePath);
    if (error || !data) {
      console.warn('⚠️ No se pudo descargar el PDF desde Supabase Storage:', error?.message);
      return null;
    }
    return Buffer.from(await data.arrayBuffer());
  } catch (err: any) {
    console.warn('⚠️ Error descargando PDF desde Supabase Storage:', err?.message || err);
    return null;
  }
}

/**
 * Hidrata el store en memoria con los documentos ya guardados en Supabase.
 * Se llama una vez al arrancar el servidor — sin esto, los PDFs subidos
 * "desaparecían" del RAG con cada reinicio aunque siguieran en la base de
 * datos (solo se estaban escribiendo, nunca se volvían a leer).
 */
export async function loadCustomRagDocumentsFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('rag_custom_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ No se pudieron cargar documentos RAG desde Supabase:', error.message);
      return;
    }

    if (data && data.length > 0) {
      customDocumentsStore = data.map((row: any) => ({
        id: row.id,
        fileName: row.file_name,
        fileSize: row.file_size,
        processSlug: row.process_slug,
        title: row.title,
        code: row.code,
        uploadedAt: row.created_at,
        extractedText: row.extracted_text || '',
        pageCount: row.page_count || 1,
        chunkCount: row.chunk_count || 1,
        summary: row.summary || undefined,
        documentType: normalizeDocumentType(row.document_type),
        storagePath: row.storage_path || undefined
      }));
      console.log(`✅ ${data.length} documento(s) RAG cargados desde Supabase.`);
    }
  } catch (err: any) {
    console.warn('⚠️ Error cargando documentos RAG desde Supabase:', err?.message || err);
  }
}

export interface ProcessPdfResult {
  document: CustomRagDocument;
  /** false si Supabase está configurado pero el guardado falló — el documento
   * solo vive en memoria y desaparecerá al reiniciar el servidor. */
  persistedToSupabase: boolean;
  /** true si ya existía un documento con el mismo nombre y tamaño en este
   * proceso — no se creó una copia nueva, se reutilizó la existente. */
  isDuplicate: boolean;
}

export async function processAndSavePdfDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number,
  processSlug: string,
  customTitle?: string,
  /** Cuando el navegador ya subió el archivo directo a Storage (PDFs
   * grandes, vía signed upload URL) — se reutiliza ese id/ruta en vez de
   * generar uno nuevo y de volver a subir el archivo. */
  preUploaded?: { docId: string; storagePath: string },
  documentType?: RagDocumentType
): Promise<ProcessPdfResult> {
  const normalizedProcessSlug = processSlug || 'general';
  const supabase = getSupabaseClient();

  // Evita documentos duplicados cuando el mismo archivo se envía dos veces
  // seguidas (doble clic, reintento de red tras un timeout en celular, etc.):
  // si ya existe un documento con el mismo nombre y tamaño para este proceso,
  // se reutiliza la fila existente en vez de crear una nueva.
  if (supabase) {
    const { data: existingRow } = await supabase
      .from('rag_custom_documents')
      .select('*')
      .eq('process_slug', normalizedProcessSlug)
      .eq('file_name', fileName)
      .eq('file_size', fileSize)
      .limit(1)
      .maybeSingle();

    if (existingRow) {
      console.log(`ℹ️ El archivo "${fileName}" ya estaba indexado para "${normalizedProcessSlug}" — se reutiliza en vez de duplicarlo.`);
      const existingDoc: CustomRagDocument = {
        id: existingRow.id,
        fileName: existingRow.file_name,
        fileSize: existingRow.file_size,
        processSlug: existingRow.process_slug,
        title: existingRow.title,
        code: existingRow.code,
        uploadedAt: existingRow.created_at,
        extractedText: existingRow.extracted_text || '',
        pageCount: existingRow.page_count || 1,
        chunkCount: existingRow.chunk_count || 1,
        summary: existingRow.summary || undefined,
        documentType: normalizeDocumentType(existingRow.document_type),
        storagePath: existingRow.storage_path || undefined
      };
      if (!customDocumentsStore.find(d => d.id === existingDoc.id)) {
        customDocumentsStore.unshift(existingDoc);
      }
      // El archivo ya subido a Storage para este intento duplicado no se usará
      // — se borra para no dejar copias huérfanas del PDF en el bucket.
      if (preUploaded && preUploaded.storagePath !== existingDoc.storagePath) {
        await supabase.storage.from(RAG_PDF_BUCKET).remove([preUploaded.storagePath]);
      }
      return { document: existingDoc, persistedToSupabase: true, isDuplicate: true };
    }
  }

  console.log(`📄 Procesando archivo PDF para RAG: ${fileName} (${fileSize} bytes)...`);

  let textExtracted = '';
  let pageCount = 1;

  // Import perezoso: pdf-parse solo hace falta al procesar una subida real.
  // Si se importara arriba a nivel de módulo, cualquier ruta que solo
  // necesite otra función de este archivo (chat, dashboard, detalle de
  // proceso — todas pasan por loadCustomRagDocumentsFromSupabase al
  // hidratar) cargaría pdf-parse igual, sin necesitarlo.
  //
  // CanvasFactory es obligatorio en este entorno: pdfjs-dist (que pdf-parse
  // usa por dentro) necesita DOMMatrix/Canvas para ciertas operaciones, que
  // no existen en el runtime serverless de Node de Vercel. Sin esto, la
  // extracción fallaba en silencio (excepción capturada abajo) y caía a un
  // respaldo que solo vuelca los bytes crudos del PDF como "texto".
  const { CanvasFactory } = await import('pdf-parse/worker');
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: fileBuffer, CanvasFactory });
  try {
    const result = await parser.getText();
    // Quita los separadores de página que agrega la librería ("-- 1 of 3 --")
    textExtracted = result.text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, ' ');
    pageCount = result.total || 1;
    console.log(`✅ Texto extraído con éxito de PDF (${pageCount} páginas, ${textExtracted.length} caracteres).`);
  } catch (err: any) {
    console.warn(`⚠️ Error analizando PDF con pdf-parse, realizando extracción de fallback:`, err.message);
    // Fallback simple si el PDF no se pudo parsear (ej. escaneado sin capa de texto)
    const rawStr = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\táéíóúÁÉÍÓÚñÑ]/g, ' ');
    textExtracted = rawStr.substring(0, 10000);
    pageCount = 1;
  } finally {
    await parser.destroy();
  }

  // Clean and trim text
  const cleanText = textExtracted.replace(/\s+/g, ' ').trim();
  const chunks = Math.ceil(cleanText.length / 800) || 1;

  const docId = preUploaded?.docId || `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const title = customTitle || fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  const code = `PDF-RAG-${Math.floor(100 + Math.random() * 900)}`;

  const newDoc: CustomRagDocument = {
    id: docId,
    fileName,
    fileSize,
    processSlug: normalizedProcessSlug,
    title,
    code,
    uploadedAt: new Date().toISOString(),
    extractedText: cleanText || 'Sin texto legible extraído del archivo PDF.',
    pageCount,
    chunkCount: chunks,
    summary: cleanText.substring(0, 250) + (cleanText.length > 250 ? '...' : ''),
    documentType: normalizeDocumentType(documentType),
    storagePath: preUploaded?.storagePath
  };

  customDocumentsStore.unshift(newDoc);
  let persistedToSupabase = false;

  // Intentar guardar en Supabase si la tabla existe
  if (supabase) {
    try {
      // Subir el PDF original a Storage para poder visualizarlo dentro de la app
      // (el texto extraído es solo para el motor RAG, no es legible por una persona).
      // Si el navegador ya lo subió directo (preUploaded, PDFs grandes vía
      // signed upload URL) no hay nada que subir de nuevo aquí.
      if (preUploaded) {
        console.log(`✅ PDF original ya estaba en Storage (carga directa): ${preUploaded.storagePath}`);
      } else {
        const storagePath = `${newDoc.processSlug}/${newDoc.id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from(RAG_PDF_BUCKET)
          .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true });

        if (uploadError) {
          console.warn('⚠️ No se pudo guardar el PDF original en Supabase Storage:', uploadError.message);
        } else {
          newDoc.storagePath = storagePath;
          console.log(`✅ PDF original guardado en Storage: ${storagePath}`);
        }
      }

      const { error: insertError } = await supabase.from('rag_custom_documents').insert({
        id: newDoc.id,
        file_name: newDoc.fileName,
        file_size: newDoc.fileSize,
        process_slug: newDoc.processSlug,
        title: newDoc.title,
        code: newDoc.code,
        extracted_text: newDoc.extractedText,
        page_count: newDoc.pageCount,
        chunk_count: newDoc.chunkCount,
        summary: newDoc.summary,
        document_type: newDoc.documentType,
        storage_path: newDoc.storagePath,
        created_at: newDoc.uploadedAt
      });

      if (insertError) {
        // Sin la fila en rag_custom_documents no tiene sentido intentar los
        // fragmentos (violarían la llave foránea) — se detiene aquí y se avisa
        // con claridad en vez de fallar en silencio.
        console.error('❌ No se pudo guardar el documento RAG en Supabase (revisa que corriste el último db/schema.sql):', insertError.message);
      } else {
        persistedToSupabase = true;
        console.log('✅ Documento RAG guardado en Supabase table rag_custom_documents.');

        // Fragmentar y generar embeddings reales para búsqueda semántica
        const realChunkCount = await embedAndStoreChunks(newDoc.id, newDoc.processSlug, newDoc.title, newDoc.code, newDoc.extractedText);
        if (realChunkCount > 0) {
          newDoc.chunkCount = realChunkCount;
          await supabase.from('rag_custom_documents').update({ chunk_count: realChunkCount }).eq('id', newDoc.id);
          console.log(`✅ ${realChunkCount} fragmento(s) indexados semánticamente para "${newDoc.title}".`);
        } else {
          console.warn(`⚠️ No se pudieron generar embeddings para "${newDoc.title}" — se usará el texto completo como respaldo.`);
        }
      }
    } catch (err) {
      console.warn('⚠️ Supabase rag_custom_documents (no crítico):', err);
    }
  }

  return { document: newDoc, persistedToSupabase: supabase ? persistedToSupabase : true, isDuplicate: false };
}

export async function deleteCustomRagDocument(id: string): Promise<boolean> {
  const docToDelete = customDocumentsStore.find(doc => doc.id === id);
  customDocumentsStore = customDocumentsStore.filter(doc => doc.id !== id);

  const supabase = getSupabaseClient();
  // Sin Supabase configurado, el store en memoria de esta instancia es la
  // única fuente de verdad posible.
  if (!supabase) return !!docToDelete;

  try {
    // Los fragmentos en rag_document_chunks se borran solos (ON DELETE CASCADE)
    const { error: deleteError } = await supabase.from('rag_custom_documents').delete().eq('id', id);
    if (deleteError) {
      console.warn('⚠️ Error eliminando documento RAG en Supabase:', deleteError.message);
      return false;
    }

    if (docToDelete?.storagePath) {
      const { error: removeError } = await supabase.storage.from(RAG_PDF_BUCKET).remove([docToDelete.storagePath]);
      if (removeError) {
        console.warn('⚠️ Error eliminando el PDF original en Supabase Storage:', removeError.message);
      }
    }

    // Éxito determinado por el resultado real en Supabase, no por si esta
    // instancia serverless en particular tenía el documento en su caché en
    // memoria — dos requests seguidos pueden caer en instancias distintas,
    // cada una hidratada en un momento diferente.
    return true;
  } catch (err) {
    console.warn('⚠️ Error eliminando documento RAG en Supabase:', err);
    return false;
  }
}

/**
 * Métricas de cobertura documental para el Dashboard de Supervisores:
 * cuántos PDFs hay cargados por proceso y qué procesos aún no tienen ninguno.
 */
export function getRagCoverageMetrics() {
  const totalDocuments = customDocumentsStore.length;

  const byProcess = PROCESSES.map(p => ({
    processSlug: p.slug,
    processName: p.name,
    documentCount: customDocumentsStore.filter(doc => doc.processSlug === p.slug).length
  })).sort((a, b) => b.documentCount - a.documentCount);

  const processesWithDocs = byProcess.filter(p => p.documentCount > 0).length;
  const processesWithoutDocs = byProcess.filter(p => p.documentCount === 0).map(p => p.processName);

  return {
    totalDocuments,
    totalProcesses: PROCESSES.length,
    processesWithDocs,
    processesWithoutDocs,
    byProcess
  };
}
