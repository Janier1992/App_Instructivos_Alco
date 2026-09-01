import { getSupabaseClient } from './supabaseService';
import { AcceptanceCriterion } from '../types';

/**
 * Criterios de aceptación/rechazo que Calidad agrega al "cerrar el ciclo" de
 * una escalación ya resuelta — para que la misma pregunta no vuelva a
 * escalar. Se guardan en Supabase (tabla dynamic_criteria) y se mantienen en
 * memoria por proceso, igual que customRagStore.ts, porque se leen en cada
 * consulta del chat y en cada carga de la vista pública del proceso.
 */

export interface DynamicCriterion extends AcceptanceCriterion {
  isDynamic: true;
  sourceQuestion?: string;
  createdAt: string;
}

const criteriaStore: Record<string, DynamicCriterion[]> = {};

function mapRow(row: any): DynamicCriterion {
  return {
    id: row.id,
    processId: row.process_slug,
    controlId: 'Cierre de ciclo',
    parameter: row.parameter,
    acceptance: row.acceptance,
    rejection: row.rejection,
    requiredAction: row.required_action,
    isDynamic: true,
    sourceQuestion: row.source_question || undefined,
    createdAt: row.created_at
  };
}

export async function loadDynamicCriteriaFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('dynamic_criteria')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ No se pudieron cargar los criterios dinámicos desde Supabase:', error.message);
      return;
    }

    for (const key of Object.keys(criteriaStore)) delete criteriaStore[key];
    for (const row of data || []) {
      if (!criteriaStore[row.process_slug]) criteriaStore[row.process_slug] = [];
      criteriaStore[row.process_slug].push(mapRow(row));
    }

    console.log(`✅ ${(data || []).length} criterio(s) dinámico(s) cargado(s) desde Supabase.`);
  } catch (err: any) {
    console.warn('⚠️ Error cargando criterios dinámicos:', err?.message || err);
  }
}

export function getDynamicCriteria(processSlug: string): DynamicCriterion[] {
  return criteriaStore[processSlug] || [];
}

export async function createDynamicCriterion(params: {
  processSlug: string;
  parameter: string;
  acceptance: string;
  rejection: string;
  requiredAction: string;
  sourceQuestion?: string;
  sourceFeedbackId?: string;
  createdBy?: string;
}): Promise<{ success: boolean; criterion?: DynamicCriterion; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('dynamic_criteria')
      .insert({
        process_slug: params.processSlug,
        parameter: params.parameter.trim(),
        acceptance: params.acceptance.trim(),
        rejection: params.rejection.trim(),
        required_action: params.requiredAction.trim(),
        source_question: params.sourceQuestion?.trim() || null,
        source_feedback_id: params.sourceFeedbackId || null,
        created_by: params.createdBy || null
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo crear el criterio dinámico:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }

    const criterion = mapRow(data);
    if (!criteriaStore[params.processSlug]) criteriaStore[params.processSlug] = [];
    criteriaStore[params.processSlug].unshift(criterion);

    return { success: true, criterion };
  } catch (err: any) {
    console.warn('⚠️ Error creando criterio dinámico:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}
