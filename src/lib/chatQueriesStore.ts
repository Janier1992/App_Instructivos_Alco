import { getSupabaseClient } from './supabaseService';

/**
 * Bitácora liviana de preguntas hechas al Agente de IA, por proceso — a
 * diferencia de chat_feedback (que solo captura lo que alguien calificó),
 * esto registra toda pregunta real escrita/dictada, para poder mostrar como
 * sugerencias rápidas del chat lo que la gente de ese proceso pregunta de
 * verdad más seguido, en vez de 3 sugerencias fijas iguales para los 8
 * procesos. Solo texto, sin binarios: impacto de almacenamiento mínimo.
 */

// Clasificaciones que no deben contar como "pregunta frecuente" sugerible:
// intentos de manipulación y consultas de otro proceso no son útiles como
// sugerencia para el siguiente colaborador.
const EXCLUDED_CLASSIFICATIONS = new Set(['H_INTENTO_MANIPULACION_INYECCION', 'G_FUERA_DE_ALCANCE']);
const MIN_QUESTION_LENGTH = 8;

function normalizeQuestion(question: string): string {
  return question
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function recordChatQuery(processSlug: string, question: string, classification?: string): Promise<void> {
  const trimmed = question.trim();
  if (trimmed.length < MIN_QUESTION_LENGTH) return;
  if (classification && EXCLUDED_CLASSIFICATIONS.has(classification)) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('chat_queries').insert({
      process_slug: processSlug,
      question: trimmed,
      question_normalized: normalizeQuestion(trimmed).slice(0, 300),
      classification: classification || null
    });
    if (error) {
      console.warn('⚠️ No se pudo registrar la pregunta del chat:', error.message);
    }
  } catch (err: any) {
    // Best-effort: nunca debe tumbar la respuesta del chat por esto.
    console.warn('⚠️ Error registrando pregunta del chat:', err?.message || err);
  }
}

/**
 * Top N preguntas más repetidas (por texto normalizado) para un proceso,
 * con el texto original más reciente de cada grupo como texto a mostrar.
 * Se agrupa en memoria sobre las últimas ~500 preguntas del proceso — a la
 * escala de una sola planta, es más simple y suficientemente rápido que
 * escribir una función agregada en Postgres para esto.
 */
export async function getTopQuestions(processSlug: string, limit: number = 4): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('chat_queries')
      .select('question, question_normalized, created_at')
      .eq('process_slug', processSlug)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !data) return [];

    const groups = new Map<string, { question: string; count: number; lastSeen: string }>();
    for (const row of data as any[]) {
      const key = row.question_normalized;
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
      } else {
        groups.set(key, { question: row.question, count: 1, lastSeen: row.created_at });
      }
    }

    return Array.from(groups.values())
      .filter(g => g.count >= 2) // solo preguntas que de verdad se repitieron
      .sort((a, b) => (b.count - a.count) || (new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()))
      .slice(0, limit)
      .map(g => g.question);
  } catch (err: any) {
    console.warn('⚠️ Error obteniendo preguntas frecuentes del chat:', err?.message || err);
    return [];
  }
}
