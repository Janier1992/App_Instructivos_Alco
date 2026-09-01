import { getSupabaseClient } from './supabaseService';

/**
 * Formularios de inspección embebidos (Microsoft Forms u otra plataforma
 * que soporte "insertar código"), gestionados desde el CRM y mostrados en
 * la pestaña "Formularios" del proceso — se abren dentro de un iframe en la
 * misma app, no en una pestaña aparte. Se lee poco (una vez por carga de
 * pestaña), así que no mantiene caché en memoria, igual que
 * collaboratorCompetenciesStore.ts.
 */

export interface InspectionForm {
  id: string;
  processSlug: string;
  title: string;
  embedUrl: string;
  /** URL de embed (Excel Online / SharePoint) de las respuestas reales del formulario — nunca se guardan en esta base de datos, solo se referencian. */
  recordsEmbedUrl?: string;
  displayOrder: number;
  createdAt: string;
}

function mapRow(row: any): InspectionForm {
  return {
    id: row.id,
    processSlug: row.process_slug,
    title: row.title,
    embedUrl: row.embed_url,
    recordsEmbedUrl: row.records_embed_url || undefined,
    displayOrder: row.display_order,
    createdAt: row.created_at
  };
}

export async function getInspectionForms(processSlug: string): Promise<InspectionForm[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('inspection_forms')
      .select('*')
      .eq('process_slug', processSlug)
      .order('display_order', { ascending: true });
    if (error) {
      console.warn('⚠️ No se pudieron cargar los formularios de inspección:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando formularios de inspección:', err?.message || err);
    return [];
  }
}

export async function createInspectionForm(params: {
  processSlug: string;
  title: string;
  embedUrl: string;
  recordsEmbedUrl?: string;
  displayOrder?: number;
  createdBy?: string;
}): Promise<{ success: boolean; form?: InspectionForm; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('inspection_forms')
      .insert({
        process_slug: params.processSlug,
        title: params.title.trim(),
        embed_url: params.embedUrl.trim(),
        records_embed_url: params.recordsEmbedUrl?.trim() || null,
        display_order: params.displayOrder ?? 0,
        created_by: params.createdBy || null
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo crear el formulario de inspección:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, form: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error creando formulario de inspección:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

/** Actualiza la URL de la Vista de Registros (Excel Online/SharePoint) de un formulario ya creado. */
export async function updateInspectionFormRecordsUrl(
  id: string,
  recordsEmbedUrl: string
): Promise<{ success: boolean; form?: InspectionForm; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase
      .from('inspection_forms')
      .update({ records_embed_url: recordsEmbedUrl.trim() || null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ No se pudo actualizar la vista de registros:', error?.message);
      return { success: false, error: error?.message || 'Error desconocido.' };
    }
    return { success: true, form: mapRow(data) };
  } catch (err: any) {
    console.warn('⚠️ Error actualizando vista de registros:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function deleteInspectionForm(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase.from('inspection_forms').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo eliminar el formulario de inspección:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error eliminando formulario de inspección:', err?.message || err);
    return { success: false };
  }
}
