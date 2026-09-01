import { getSupabaseClient } from './supabaseService';

/**
 * Adjuntos (imágenes, máx. 3 MB) de una tarea del tablero de Calidad. El
 * archivo real vive en Supabase Storage (bucket quality-task-attachments,
 * privado); esta tabla solo guarda metadatos, igual que process_videos.
 */

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const BUCKET = 'quality-task-attachments';

export interface QualityTaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string;
}

function mapRow(row: any): QualityTaskAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    contentType: row.content_type,
    createdAt: row.created_at
  };
}

export async function getTaskAttachments(taskId: string): Promise<QualityTaskAttachment[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('quality_task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('⚠️ No se pudieron cargar los adjuntos de la tarea:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando adjuntos de la tarea:', err?.message || err);
    return [];
  }
}

export async function addTaskAttachment(params: {
  taskId: string;
  fileBuffer: Buffer;
  fileName: string;
  contentType: string;
}): Promise<{ success: boolean; attachment?: QualityTaskAttachment; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  if (params.fileBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
    return { success: false, error: 'La imagen supera el límite de 3 MB.' };
  }

  const storagePath = `${params.taskId}/${Date.now()}-${params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  try {
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, params.fileBuffer, {
      contentType: params.contentType,
      upsert: false
    });
    if (uploadError) {
      console.warn('⚠️ No se pudo subir el adjunto de la tarea:', uploadError.message);
      return { success: false, error: uploadError.message };
    }

    const { data, error } = await supabase
      .from('quality_task_attachments')
      .insert({
        task_id: params.taskId,
        file_name: params.fileName,
        file_size: params.fileBuffer.byteLength,
        content_type: params.contentType,
        storage_path: storagePath
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo guardar el adjunto de la tarea:', error?.message);
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, attachment: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error subiendo adjunto de la tarea:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function getTaskAttachmentBuffer(attachmentId: string): Promise<{ buffer: Buffer; fileName: string; contentType: string } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: row, error: rowError } = await supabase
      .from('quality_task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();
    if (rowError || !row) return null;

    const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(row.storage_path);
    if (downloadError || !fileData) {
      console.warn('⚠️ No se pudo descargar el adjunto de la tarea:', downloadError?.message);
      return null;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      fileName: row.file_name,
      contentType: row.content_type || 'application/octet-stream'
    };
  } catch (err: any) {
    console.warn('⚠️ Error obteniendo adjunto de la tarea:', err?.message || err);
    return null;
  }
}

export async function deleteTaskAttachment(attachmentId: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { data: row } = await supabase.from('quality_task_attachments').select('storage_path').eq('id', attachmentId).single();
    const { error } = await supabase.from('quality_task_attachments').delete().eq('id', attachmentId);
    if (error) {
      console.warn('⚠️ No se pudo eliminar el adjunto de la tarea:', error.message);
      return { success: false };
    }
    if (row?.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error eliminando adjunto de la tarea:', err?.message || err);
    return { success: false };
  }
}
