import { getSupabaseClient } from './supabaseService';

/**
 * Historial de responsables por proceso: cada nombre usado como
 * "Responsable" de una tarea queda guardado aquí, para que el campo se
 * autocomplete con nombres ya usados en vez de escribirlos de cero cada
 * vez. recordAssignee() se llama automáticamente al crear/editar una tarea
 * con un responsable — no requiere una acción explícita del usuario.
 */

export async function getTaskAssignees(processSlug: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('quality_task_assignees')
      .select('name')
      .eq('process_slug', processSlug)
      .order('name', { ascending: true });
    if (error) {
      console.warn('⚠️ No se pudo cargar el historial de responsables:', error.message);
      return [];
    }
    return (data || []).map((row: any) => row.name);
  } catch (err: any) {
    console.warn('⚠️ Error cargando historial de responsables:', err?.message || err);
    return [];
  }
}

export async function recordTaskAssignee(processSlug: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('quality_task_assignees')
      .upsert({ process_slug: processSlug, name: trimmed }, { onConflict: 'process_slug,name', ignoreDuplicates: true });
    if (error) {
      console.warn('⚠️ No se pudo guardar el responsable en el historial:', error.message);
    }
  } catch (err: any) {
    console.warn('⚠️ Error guardando responsable en el historial:', err?.message || err);
  }
}
