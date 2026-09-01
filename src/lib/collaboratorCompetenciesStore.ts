import { getSupabaseClient } from './supabaseService';

/**
 * Competencia verificada del equipo por proceso, siguiendo el marco ILUO
 * (estándar en plantas certificadas IATF-16949): I = en inducción, L = en
 * aprendizaje supervisado, U = capacitado para trabajar sin supervisión,
 * O = puede entrenar a otros. Es el roster completo del equipo de un
 * proceso — a diferencia de autonomy_role_assignments (un solo nombre por
 * nivel), aquí cada colaborador tiene su propio estado de competencia.
 *
 * Se lee poco (vista CRM + badge público de "Equipo Certificado"), así que
 * no mantiene caché en memoria: consulta Supabase directo, igual que
 * chatFeedbackStore.ts.
 */

export type IluoLevel = 'I' | 'L' | 'U' | 'O';

export interface CollaboratorCompetency {
  id: string;
  processSlug: string;
  collaboratorName: string;
  iluoLevel: IluoLevel;
  notes?: string;
  updatedAt: string;
}

function mapRow(row: any): CollaboratorCompetency {
  return {
    id: row.id,
    processSlug: row.process_slug,
    collaboratorName: row.collaborator_name,
    iluoLevel: row.iluo_level,
    notes: row.notes || undefined,
    updatedAt: row.updated_at
  };
}

export async function getCompetencies(processSlug: string): Promise<CollaboratorCompetency[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('collaborator_competencies')
      .select('*')
      .eq('process_slug', processSlug)
      .order('collaborator_name', { ascending: true });
    if (error) {
      console.warn('⚠️ No se pudo cargar la competencia del equipo:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando competencia del equipo:', err?.message || err);
    return [];
  }
}

export async function upsertCompetency(params: {
  processSlug: string;
  collaboratorName: string;
  iluoLevel: IluoLevel;
  notes?: string;
  updatedBy?: string;
}): Promise<{ success: boolean; competency?: CollaboratorCompetency; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('collaborator_competencies')
      .upsert(
        {
          process_slug: params.processSlug,
          collaborator_name: params.collaboratorName.trim(),
          iluo_level: params.iluoLevel,
          notes: params.notes?.trim() || null,
          updated_by: params.updatedBy || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'process_slug,collaborator_name' }
      )
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo guardar la competencia:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, competency: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error guardando competencia:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function deleteCompetency(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase.from('collaborator_competencies').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo eliminar la competencia:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error eliminando competencia:', err?.message || err);
    return { success: false };
  }
}
