import { getSupabaseClient } from './supabaseService';
import { normalizeVideoEmbedUrl } from './processVideosStore';

const CIRCULAR_ATTACHMENTS_BUCKET = 'circular-attachments';

export type CircularStatus = 'draft' | 'published';

export interface Circular {
  id: string;
  title: string;
  bodyText: string | null;
  attachmentStoragePath: string | null;
  attachmentFileName: string | null;
  attachmentContentType: string | null;
  embedUrl: string | null;
  processSlugs: string[];
  status: CircularStatus;
  displayOrder: number;
  createdBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Circulares informativas (texto y/o adjunto, asociadas a procesos/áreas).
 * Mismo patrón "best effort" que el resto de stores: caché en memoria +
 * persistencia en Supabase, hidratado una vez por cold start.
 */
let circularesStore: Circular[] = [];

function mapRow(row: any): Circular {
  return {
    id: row.id,
    title: row.title,
    bodyText: row.body_text,
    attachmentStoragePath: row.attachment_storage_path,
    attachmentFileName: row.attachment_file_name,
    attachmentContentType: row.attachment_content_type || null,
    embedUrl: row.embed_url || null,
    processSlugs: row.process_slugs || [],
    status: row.status,
    displayOrder: row.display_order ?? 0,
    createdBy: row.created_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function loadCircularesFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('circulares')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ No se pudieron cargar las circulares desde Supabase:', error.message);
      return;
    }

    circularesStore = (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando circulares:', err?.message || err);
  }
}

function sortForDisplay(circulars: Circular[]): Circular[] {
  return [...circulars].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
  });
}

export function getPublishedCirculares(processSlug?: string): Circular[] {
  const published = circularesStore.filter(c => c.status === 'published');
  if (!processSlug) return sortForDisplay(published);
  return sortForDisplay(published.filter(c => c.processSlugs.length === 0 || c.processSlugs.includes(processSlug)));
}

export function getAllCircularesForAdmin(): Circular[] {
  return circularesStore;
}

export function getCircularById(id: string): Circular | undefined {
  return circularesStore.find(c => c.id === id);
}

export async function uploadCircularAttachment(
  circularId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const storagePath = `${circularId}/${fileName}`;
  const { error } = await supabase.storage
    .from(CIRCULAR_ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: true });

  if (error) {
    console.warn('⚠️ No se pudo guardar el adjunto de la circular en Supabase Storage:', error.message);
    return null;
  }
  return storagePath;
}

export async function getCircularAttachmentBuffer(circular: Circular): Promise<Buffer | null> {
  if (!circular.attachmentStoragePath) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage
      .from(CIRCULAR_ATTACHMENTS_BUCKET)
      .download(circular.attachmentStoragePath);

    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}

export async function createCircular(params: {
  title: string;
  bodyText?: string;
  processSlugs: string[];
  createdBy: string;
  displayOrder?: number;
  embedUrl?: string;
  attachment?: { fileBuffer: Buffer; fileName: string; contentType: string };
}): Promise<{ success: boolean; circular?: Circular; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const { data, error } = await supabase
    .from('circulares')
    .insert({
      title: params.title.trim(),
      body_text: params.bodyText?.trim() || null,
      process_slugs: params.processSlugs,
      status: 'draft',
      display_order: params.displayOrder ?? 0,
      embed_url: params.embedUrl ? normalizeVideoEmbedUrl(params.embedUrl.trim()) : null,
      created_by: params.createdBy
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo crear la circular.' };
  }

  let circular = mapRow(data);

  if (params.attachment) {
    const storagePath = await uploadCircularAttachment(
      circular.id,
      params.attachment.fileBuffer,
      params.attachment.fileName,
      params.attachment.contentType
    );
    if (storagePath) {
      await supabase
        .from('circulares')
        .update({
          attachment_storage_path: storagePath,
          attachment_file_name: params.attachment.fileName,
          attachment_content_type: params.attachment.contentType
        })
        .eq('id', circular.id);
      circular = {
        ...circular,
        attachmentStoragePath: storagePath,
        attachmentFileName: params.attachment.fileName,
        attachmentContentType: params.attachment.contentType
      };
    }
  }

  circularesStore.unshift(circular);
  return { success: true, circular };
}

export async function updateCircular(
  id: string,
  updates: {
    title?: string;
    bodyText?: string;
    processSlugs?: string[];
    status?: CircularStatus;
    displayOrder?: number;
    embedUrl?: string | null;
  }
): Promise<{ success: boolean; circular?: Circular; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if (updates.bodyText !== undefined) patch.body_text = updates.bodyText.trim() || null;
  if (updates.processSlugs !== undefined) patch.process_slugs = updates.processSlugs;
  if (updates.displayOrder !== undefined) patch.display_order = updates.displayOrder;
  if (updates.embedUrl !== undefined) {
    patch.embed_url = updates.embedUrl ? normalizeVideoEmbedUrl(updates.embedUrl.trim()) : null;
  }
  if (updates.status !== undefined) {
    patch.status = updates.status;
    // Al despublicar (status -> 'draft') NO se borra published_at: así se
    // distingue "nunca publicado" (published_at nulo) de "despublicado"
    // (tuvo published_at) para la vista de administración.
    if (updates.status === 'published') {
      patch.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase.from('circulares').update(patch).eq('id', id).select('*').single();

  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo actualizar la circular.' };
  }

  const circular = mapRow(data);
  // Si esta instancia serverless no tenía la fila en su caché en memoria
  // (se creó en una instancia distinta, con otra hidratación), .map() no la
  // habría agregado — se agrega explícitamente para que quede consistente
  // en esta instancia también.
  const existsInMemory = circularesStore.some(c => c.id === id);
  circularesStore = existsInMemory
    ? circularesStore.map(c => (c.id === id ? circular : c))
    : [circular, ...circularesStore];
  return { success: true, circular };
}

export async function deleteCircular(id: string): Promise<boolean> {
  const circular = circularesStore.find(c => c.id === id);
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from('circulares').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ Error eliminando circular en Supabase:', error.message);
    return false;
  }

  if (circular?.attachmentStoragePath) {
    await supabase.storage.from(CIRCULAR_ATTACHMENTS_BUCKET).remove([circular.attachmentStoragePath]);
  }

  circularesStore = circularesStore.filter(c => c.id !== id);
  return true;
}
