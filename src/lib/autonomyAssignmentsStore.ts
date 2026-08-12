import { getSupabaseClient } from './supabaseService';

/**
 * Nombre real del colaborador de planta asignado a cada nivel de autonomía de
 * cada proceso. Se guarda en Supabase (tabla `autonomy_role_assignments`) y
 * se mantiene un mapa en memoria para lecturas rápidas, igual que
 * `customRagStore.ts`. Todo es "best effort": si Supabase no está
 * configurado, las asignaciones simplemente no persisten entre reinicios.
 */

type AssignmentsByLevel = Record<string, string>;

const assignmentsStore: Record<string, AssignmentsByLevel> = {};

export async function loadAutonomyAssignmentsFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase.from('autonomy_role_assignments').select('*');
    if (error) {
      console.warn('⚠️ No se pudieron cargar las asignaciones de autonomía desde Supabase:', error.message);
      return;
    }

    for (const row of data || []) {
      if (!assignmentsStore[row.process_slug]) assignmentsStore[row.process_slug] = {};
      assignmentsStore[row.process_slug][row.level] = row.collaborator_name;
    }

    console.log(`✅ ${(data || []).length} asignación(es) de autonomía cargada(s) desde Supabase.`);
  } catch (err: any) {
    console.warn('⚠️ Error cargando asignaciones de autonomía:', err?.message || err);
  }
}

export function getAutonomyAssignments(processSlug: string): AssignmentsByLevel {
  return assignmentsStore[processSlug] || {};
}

export async function setAutonomyAssignment(
  processSlug: string,
  level: string,
  collaboratorName: string
): Promise<{ success: boolean; persistedToSupabase: boolean }> {
  const trimmedName = collaboratorName.trim();

  if (!assignmentsStore[processSlug]) assignmentsStore[processSlug] = {};
  assignmentsStore[processSlug][level] = trimmedName;

  const supabase = getSupabaseClient();
  if (!supabase) return { success: true, persistedToSupabase: false };

  try {
    const { error } = await supabase
      .from('autonomy_role_assignments')
      .upsert({ process_slug: processSlug, level, collaborator_name: trimmedName, updated_at: new Date().toISOString() });

    if (error) {
      console.warn('⚠️ No se pudo guardar la asignación de autonomía en Supabase:', error.message);
      return { success: true, persistedToSupabase: false };
    }

    return { success: true, persistedToSupabase: true };
  } catch (err: any) {
    console.warn('⚠️ Error guardando asignación de autonomía:', err?.message || err);
    return { success: true, persistedToSupabase: false };
  }
}
