import { getSupabaseClient } from './supabaseService';

/**
 * Comentarios de gestión sobre una publicación de Principal. Sin cuenta de
 * usuario en la app pública, así que nacen ocultos ('pending') hasta que un
 * Administrador los aprueba desde el CRM — evita que un comentario
 * inapropiado quede visible de inmediato para todo el proceso.
 */

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface CircularComment {
  id: string;
  circularId: string;
  authorName: string;
  commentText: string;
  status: CommentStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface CircularCommentWithTitle extends CircularComment {
  circularTitle: string;
}

function mapRow(row: any): CircularComment {
  return {
    id: row.id,
    circularId: row.circular_id,
    authorName: row.author_name,
    commentText: row.comment_text,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by
  };
}

export async function createComment(
  circularId: string,
  authorName: string,
  commentText: string
): Promise<{ success: boolean; comment?: CircularComment; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const { data, error } = await supabase
    .from('circular_comments')
    .insert({
      circular_id: circularId,
      author_name: authorName.trim().slice(0, 255),
      comment_text: commentText.trim(),
      status: 'pending'
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo enviar el comentario.' };
  }
  return { success: true, comment: mapRow(data) };
}

/** Lectura pública: siempre fresca desde Supabase (no hay caché en memoria que rezagar aquí). */
export async function getApprovedComments(circularId: string): Promise<CircularComment[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('circular_comments')
    .select('*')
    .eq('circular_id', circularId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map(mapRow);
}

/** Cola de moderación del CRM: pendientes primero, con el título de la publicación para dar contexto. */
export async function getCommentsForModeration(): Promise<CircularCommentWithTitle[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('circular_comments')
    .select('*, circulares(title)')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => ({ ...mapRow(row), circularTitle: row.circulares?.title || '(publicación eliminada)' }));
}

export async function reviewComment(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
): Promise<{ success: boolean; comment?: CircularComment; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const { data, error } = await supabase
    .from('circular_comments')
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo actualizar el comentario.' };
  }
  return { success: true, comment: mapRow(data) };
}

/** Elimina un comentario definitivamente (incluye ya aprobados) — deja de existir para la moderación y para la vista pública. */
export async function deleteComment(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from('circular_comments').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ Error eliminando comentario:', error.message);
    return false;
  }
  return true;
}
