import { getSupabaseClient } from './supabaseService';

/**
 * Retroalimentación 👍/👎 del colaborador sobre una respuesta del Agente de
 * IA — se sigue registrando desde el chat público como bitácora, aunque el
 * módulo de revisión en el CRM ya no existe.
 */
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
