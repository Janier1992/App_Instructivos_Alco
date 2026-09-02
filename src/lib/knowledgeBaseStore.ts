import { getSupabaseClient } from './supabaseService';
import { extractMarkdownFromPdf } from './knowledgePdfExtraction';
import { embedAndStoreKnowledgeChunks } from './ragRetrieval';

const BUCKET = 'knowledge-base-source';

export type KnowledgeDocumentStatus = 'draft' | 'published';

export interface KnowledgeDocument {
  id: string;
  processSlug: string;
  title: string;
  fileName?: string;
  fileSize?: number;
  markdownContent: string;
  status: KnowledgeDocumentStatus;
  pageCount?: number;
  visionPagesUsed: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

function mapRow(row: any): KnowledgeDocument {
  return {
    id: row.id,
    processSlug: row.process_slug,
    title: row.title,
    fileName: row.file_name || undefined,
    fileSize: row.file_size || undefined,
    markdownContent: row.markdown_content || '',
    status: row.status,
    pageCount: row.page_count || undefined,
    visionPagesUsed: row.vision_pages_used || 0,
    chunkCount: row.chunk_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || undefined
  };
}

/**
 * Convierte el PDF ya subido a Markdown (texto + visión en páginas con poco
 * texto) y lo guarda como borrador — todavía no lo usa el Agente de IA.
 * Calidad debe revisarlo y publicarlo explícitamente (ver
 * publishKnowledgeDocument).
 *
 * El PDF llega siempre ya subido a Storage (ver
 * /api/crm/knowledge-base/upload-url) — el navegador lo sube ahí directo
 * con una signed upload URL, sin importar su tamaño, para esquivar el
 * límite de tamaño de request de las funciones serverless de Vercel.
 */
export async function createDraftKnowledgeDocument(params: {
  processSlug: string;
  title: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
  createdBy?: string;
}): Promise<{ success: boolean; document?: KnowledgeDocument; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data: downloaded, error: downloadError } = await supabase.storage.from(BUCKET).download(params.storagePath);
    if (downloadError || !downloaded) {
      return { success: false, error: 'No se pudo leer el PDF cargado desde Storage.' };
    }
    const fileBuffer = Buffer.from(await downloaded.arrayBuffer());

    const extraction = await extractMarkdownFromPdf(fileBuffer);

    const { data, error } = await supabase
      .from('knowledge_documents')
      .insert({
        process_slug: params.processSlug,
        title: params.title.trim(),
        file_name: params.fileName,
        file_size: params.fileSize,
        storage_path: params.storagePath,
        markdown_content: extraction.markdown,
        status: 'draft',
        page_count: extraction.pageCount,
        vision_pages_used: extraction.visionPagesUsed,
        created_by: params.createdBy || null
      })
      .select()
      .single();

    if (error || !data) {
      await supabase.storage.from(BUCKET).remove([params.storagePath]);
      return { success: false, error: error?.message || 'No se pudo guardar el documento.' };
    }

    return { success: true, document: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error creando documento de Base de Conocimiento:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function getKnowledgeDocuments(processSlug?: string): Promise<KnowledgeDocument[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('knowledge_documents').select('*').order('created_at', { ascending: false });
    if (processSlug) query = query.eq('process_slug', processSlug);

    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ No se pudieron cargar los documentos de la Base de Conocimiento:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando Base de Conocimiento:', err?.message || err);
    return [];
  }
}

export async function getKnowledgeDocumentById(id: string): Promise<KnowledgeDocument | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('knowledge_documents').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch (err: any) {
    console.warn('⚠️ Error cargando documento de Base de Conocimiento:', err?.message || err);
    return null;
  }
}

/** Guarda ediciones al Markdown sin publicar — el documento sigue sin usarse en el chat. */
export async function updateKnowledgeDocumentMarkdown(id: string, markdown: string): Promise<{ success: boolean; document?: KnowledgeDocument; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .update({ markdown_content: markdown, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'No se pudo guardar.' };
    }
    return { success: true, document: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error guardando Markdown de Base de Conocimiento:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

/**
 * Fragmenta y embebe el Markdown actual (el que Calidad ya revisó/editó) y
 * marca el documento como publicado — recién ahí lo usa el Agente de IA.
 * Se puede llamar de nuevo tras editar un documento ya publicado: reemplaza
 * los fragmentos anteriores por los del Markdown actual.
 */
export async function publishKnowledgeDocument(id: string): Promise<{ success: boolean; document?: KnowledgeDocument; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const doc = await getKnowledgeDocumentById(id);
  if (!doc) return { success: false, error: 'Documento no encontrado.' };
  if (!doc.markdownContent.trim()) return { success: false, error: 'El documento no tiene contenido para publicar.' };

  const chunkCount = await embedAndStoreKnowledgeChunks(id, doc.processSlug, doc.title, doc.markdownContent);
  if (chunkCount === 0) {
    return { success: false, error: 'No se pudo generar el índice de búsqueda — revisa que GEMINI_API_KEY esté configurada.' };
  }

  try {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .update({ status: 'published', chunk_count: chunkCount, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'No se pudo publicar el documento.' };
    }
    return { success: true, document: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error publicando documento de Base de Conocimiento:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

/** Vuelve el documento a borrador y retira sus fragmentos del agente, sin borrar el Markdown. */
export async function unpublishKnowledgeDocument(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    await supabase.from('knowledge_document_chunks').delete().eq('document_id', id);
    const { error } = await supabase
      .from('knowledge_documents')
      .update({ status: 'draft', chunk_count: 0, published_at: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo despublicar el documento:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error despublicando documento de Base de Conocimiento:', err?.message || err);
    return { success: false };
  }
}

export async function deleteKnowledgeDocument(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { data: row } = await supabase.from('knowledge_documents').select('storage_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('knowledge_documents').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo eliminar el documento:', error.message);
      return { success: false };
    }
    if (row?.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error eliminando documento de Base de Conocimiento:', err?.message || err);
    return { success: false };
  }
}
