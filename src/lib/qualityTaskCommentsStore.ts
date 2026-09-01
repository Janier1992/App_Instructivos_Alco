import { getSupabaseClient } from './supabaseService';

/** Comentarios de una tarea del tablero de Calidad — sin cuenta de usuario, igual que el resto del módulo. */

export interface QualityTaskComment {
  id: string;
  taskId: string;
  authorName: string;
  commentText: string;
  createdAt: string;
}

function mapRow(row: any): QualityTaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorName: row.author_name,
    commentText: row.comment_text,
    createdAt: row.created_at
  };
}

export async function getTaskComments(taskId: string): Promise<QualityTaskComment[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('quality_task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('⚠️ No se pudieron cargar los comentarios de la tarea:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando comentarios de la tarea:', err?.message || err);
    return [];
  }
}

export async function addTaskComment(params: {
  taskId: string;
  authorName: string;
  commentText: string;
}): Promise<{ success: boolean; comment?: QualityTaskComment; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('quality_task_comments')
      .insert({
        task_id: params.taskId,
        author_name: params.authorName.trim(),
        comment_text: params.commentText.trim()
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo guardar el comentario de la tarea:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, comment: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error guardando comentario de la tarea:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}
