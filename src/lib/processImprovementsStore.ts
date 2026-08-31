import { getSupabaseClient } from './supabaseService';

/**
 * Buzón de mejora digital ("Kaizen") por proceso — cualquier colaborador
 * propone una mejora a un criterio o al proceso en general, sin cuenta de
 * usuario. Nace como 'proposed' y Calidad la mueve por el flujo desde el
 * CRM: proposed → in_review → implemented (o rejected).
 */

export type ImprovementStatus = 'proposed' | 'in_review' | 'implemented' | 'rejected';

export interface ProcessImprovement {
  id: string;
  processSlug: string;
  title: string;
  description: string;
  relatedCriterion: string | null;
  authorName: string | null;
  status: ImprovementStatus;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

function mapRow(row: any): ProcessImprovement {
  return {
    id: row.id,
    processSlug: row.process_slug,
    title: row.title,
    description: row.description,
    relatedCriterion: row.related_criterion,
    authorName: row.author_name,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by
  };
}

export async function createImprovement(params: {
  processSlug: string;
  title: string;
  description: string;
  relatedCriterion?: string;
  authorName?: string;
}): Promise<{ success: boolean; improvement?: ProcessImprovement; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const { data, error } = await supabase
    .from('process_improvements')
    .insert({
      process_slug: params.processSlug,
      title: params.title.trim().slice(0, 200),
      description: params.description.trim(),
      related_criterion: params.relatedCriterion?.trim() || null,
      author_name: params.authorName?.trim().slice(0, 255) || null,
      status: 'proposed'
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo enviar la propuesta.' };
  }
  return { success: true, improvement: mapRow(data) };
}

/**
 * Lista pública para un proceso — pensada para que el propio colaborador
 * vea que su idea de verdad quedó registrada y avanza. Se excluyen las
 * rechazadas de esta vista pública (Calidad sí las ve en el CRM, con su
 * motivo): mostrar rechazos en la vista de todos desalienta más de lo que
 * aporta transparencia, sin quitarle nada a la trazabilidad interna.
 */
export async function getPublicImprovements(processSlug: string): Promise<ProcessImprovement[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('process_improvements')
    .select('*')
    .eq('process_slug', processSlug)
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data.map(mapRow);
}

/** Cola de revisión del CRM: propuestas y en revisión primero, filtrable por proceso. */
export async function getImprovementsForCrm(processSlug?: string): Promise<ProcessImprovement[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  let query = supabase.from('process_improvements').select('*').order('created_at', { ascending: false }).limit(300);
  if (processSlug) query = query.eq('process_slug', processSlug);

  const { data, error } = await query;
  if (error || !data) return [];

  const statusOrder: Record<ImprovementStatus, number> = { proposed: 0, in_review: 1, implemented: 2, rejected: 3 };
  return data.map(mapRow).sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

export async function updateImprovementStatus(
  id: string,
  status: ImprovementStatus,
  reviewedBy: string,
  adminNote?: string
): Promise<{ success: boolean; improvement?: ProcessImprovement; wasNewlyImplemented: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, wasNewlyImplemented: false, error: 'Supabase no está configurado.' };

  // Se consulta el estado previo para saber si esta es la transición que
  // acaba de convertir la propuesta en "implementada" — el reconocimiento
  // público (ver /api/crm/improvements/[id]) solo debe publicarse una vez,
  // no cada vez que se vuelve a guardar una propuesta ya implementada.
  const { data: previousRow } = await supabase.from('process_improvements').select('status').eq('id', id).maybeSingle();
  const wasNewlyImplemented = status === 'implemented' && previousRow?.status !== 'implemented';

  const { data, error } = await supabase
    .from('process_improvements')
    .update({
      status,
      admin_note: adminNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, wasNewlyImplemented: false, error: error?.message || 'No se pudo actualizar la propuesta.' };
  }
  return { success: true, improvement: mapRow(data), wasNewlyImplemented };
}

export async function deleteImprovement(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from('process_improvements').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ Error eliminando propuesta de mejora:', error.message);
    return false;
  }
  return true;
}
