import { getSupabaseClient } from './supabaseService';
import { getCompetencies, IluoLevel } from './collaboratorCompetenciesStore';

/**
 * Autocertificación por unidad: el propio colaborador certifica, con su
 * nombre y contra los criterios reales del proceso, que la pieza que
 * acaba de producir cumple — antes de que Calidad la revise. Solo queda
 * exenta de revisión obligatoria si el colaborador está verificado en
 * nivel U u O del roster ILUO (collaboratorCompetenciesStore); si no está
 * verificado o algún criterio no cumple, queda marcada para revisión. La
 * autorización se recalcula siempre en el servidor — nunca se confía en lo
 * que el cliente diga sobre su propio nivel.
 */

export interface SelfCertificationResult {
  criterionId: string;
  parameter: string;
  passed: boolean;
}

export interface SelfCertification {
  id: string;
  processSlug: string;
  orderReference: string;
  collaboratorName: string;
  competencyLevel: IluoLevel | null;
  results: SelfCertificationResult[];
  allPassed: boolean;
  requiresQualityReview: boolean;
  notes?: string;
  qualityReviewedAt?: string;
  qualityReviewedBy?: string;
  qualityReviewNote?: string;
  createdAt: string;
}

function mapRow(row: any): SelfCertification {
  return {
    id: row.id,
    processSlug: row.process_slug,
    orderReference: row.order_reference,
    collaboratorName: row.collaborator_name,
    competencyLevel: row.competency_level || null,
    results: row.results || [],
    allPassed: !!row.all_passed,
    requiresQualityReview: !!row.requires_quality_review,
    notes: row.notes || undefined,
    qualityReviewedAt: row.quality_reviewed_at || undefined,
    qualityReviewedBy: row.quality_reviewed_by || undefined,
    qualityReviewNote: row.quality_review_note || undefined,
    createdAt: row.created_at
  };
}

/**
 * Crea una autocertificación. La autoridad para autocertificar sin
 * revisión obligatoria (nivel U u O) se verifica aquí, en el servidor,
 * contra el roster real — no contra lo que envíe el cliente.
 */
export async function createSelfCertification(params: {
  processSlug: string;
  orderReference: string;
  collaboratorName: string;
  results: SelfCertificationResult[];
  notes?: string;
}): Promise<{ success: boolean; certification?: SelfCertification; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const roster = await getCompetencies(params.processSlug);
  const match = roster.find(c => c.collaboratorName.trim().toLowerCase() === params.collaboratorName.trim().toLowerCase());
  const competencyLevel = match?.iluoLevel || null;
  const isAuthorized = competencyLevel === 'U' || competencyLevel === 'O';

  const allPassed = params.results.every(r => r.passed);
  const requiresQualityReview = !isAuthorized || !allPassed;

  try {
    const { data, error } = await supabase
      .from('self_certifications')
      .insert({
        process_slug: params.processSlug,
        order_reference: params.orderReference.trim(),
        collaborator_name: params.collaboratorName.trim(),
        competency_level: competencyLevel,
        results: params.results,
        all_passed: allPassed,
        requires_quality_review: requiresQualityReview,
        notes: params.notes?.trim() || null
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo guardar la autocertificación:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, certification: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error guardando autocertificación:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

/** Historial para el CRM — las que necesitan revisión y no la tienen aún, primero. */
export async function getSelfCertifications(processSlug?: string, limit: number = 200): Promise<SelfCertification[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('self_certifications').select('*').order('created_at', { ascending: false }).limit(limit);
    if (processSlug) query = query.eq('process_slug', processSlug);

    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ No se pudo cargar el historial de autocertificaciones:', error.message);
      return [];
    }

    const rows = (data || []).map(mapRow);
    rows.sort((a, b) => {
      const aPending = a.requiresQualityReview && !a.qualityReviewedAt;
      const bPending = b.requiresQualityReview && !b.qualityReviewedAt;
      if (aPending !== bPending) return aPending ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  } catch (err: any) {
    console.warn('⚠️ Error cargando historial de autocertificaciones:', err?.message || err);
    return [];
  }
}

/** Anotación de auditoría de Calidad — nunca modifica los resultados originales que el colaborador certificó. */
export async function reviewSelfCertification(
  id: string,
  reviewedBy: string,
  reviewNote?: string
): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase
      .from('self_certifications')
      .update({
        quality_reviewed_at: new Date().toISOString(),
        quality_reviewed_by: reviewedBy,
        quality_review_note: reviewNote?.trim() || null
      })
      .eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo registrar la revisión de Calidad:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error registrando revisión de Calidad:', err?.message || err);
    return { success: false };
  }
}
