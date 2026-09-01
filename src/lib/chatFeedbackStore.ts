import { getSupabaseClient } from './supabaseService';

/**
 * Retroalimentación 👍/👎 del colaborador sobre una respuesta del Agente de
 * IA — a diferencia de los demás stores, no mantiene caché en memoria: es
 * una bitácora de solo escritura desde el lado público y de solo lectura
 * desde el CRM, sin necesidad de servir la misma consulta en cada mensaje
 * del chat.
 */
export interface ChatFeedbackEntry {
  id: string;
  processSlug: string;
  question: string;
  reply: string;
  classification?: string;
  escalationRequired: boolean;
  rating: 'up' | 'down';
  comment?: string;
  /** Causa raíz que Calidad clasificó al revisar esta respuesta (ver ROOT_CAUSE_OPTIONS en CrmChatFeedbackManager). */
  rootCause?: string;
  createdAt: string;
}

function mapRow(row: any): ChatFeedbackEntry {
  return {
    id: row.id,
    processSlug: row.process_slug,
    question: row.question,
    reply: row.reply,
    classification: row.classification || undefined,
    escalationRequired: !!row.escalation_required,
    rating: row.rating,
    comment: row.comment || undefined,
    rootCause: row.root_cause || undefined,
    createdAt: row.created_at
  };
}

export async function recordChatFeedback(params: {
  processSlug: string;
  question: string;
  reply: string;
  classification?: string;
  escalationRequired?: boolean;
  rating: 'up' | 'down';
  comment?: string;
}): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('chat_feedback').insert({
      process_slug: params.processSlug,
      question: params.question,
      reply: params.reply,
      classification: params.classification || null,
      escalation_required: !!params.escalationRequired,
      rating: params.rating,
      comment: params.comment?.trim() || null
    });
    if (error) {
      console.warn('⚠️ No se pudo guardar la retroalimentación del chat:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('⚠️ Error guardando retroalimentación del chat:', err?.message || err);
    return false;
  }
}

/**
 * Listado para el CRM — los 👎 primero (lo que Calidad necesita revisar),
 * luego por fecha descendente.
 */
export async function getChatFeedback(processSlug?: string): Promise<ChatFeedbackEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('chat_feedback').select('*').order('created_at', { ascending: false }).limit(300);
    if (processSlug) query = query.eq('process_slug', processSlug);

    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ No se pudo cargar la retroalimentación del chat:', error.message);
      return [];
    }

    const rows = (data || []).map(mapRow);
    rows.sort((a, b) => {
      if (a.rating !== b.rating) return a.rating === 'down' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  } catch (err: any) {
    console.warn('⚠️ Error cargando retroalimentación del chat:', err?.message || err);
    return [];
  }
}

/**
 * Clasificación de causa raíz que Calidad asigna al revisar una respuesta
 * escalada o calificada como no útil — cierra el ciclo entre "qué pasó" y
 * "por qué de fondo pasó" (falta de criterio, falta de capacitación, etc.).
 */
export async function updateChatFeedbackRootCause(id: string, rootCause: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase
      .from('chat_feedback')
      .update({ root_cause: rootCause || null })
      .eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo guardar la causa raíz:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error guardando causa raíz:', err?.message || err);
    return { success: false };
  }
}

export async function getChatFeedbackSummary(): Promise<{ processSlug: string; up: number; down: number }[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('chat_feedback').select('process_slug, rating');
    if (error || !data) return [];

    const byProcess = new Map<string, { up: number; down: number }>();
    for (const row of data as any[]) {
      const entry = byProcess.get(row.process_slug) || { up: 0, down: 0 };
      if (row.rating === 'up') entry.up++;
      else entry.down++;
      byProcess.set(row.process_slug, entry);
    }
    return Array.from(byProcess.entries()).map(([processSlug, counts]) => ({ processSlug, ...counts }));
  } catch (err: any) {
    console.warn('⚠️ Error resumiendo retroalimentación del chat:', err?.message || err);
    return [];
  }
}
