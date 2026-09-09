import { getSupabaseClient } from './supabaseService';

/** Enlaces externos que Calidad quiere abrir dentro de la app, embebidos en un iframe. */
export interface FieldInspectionLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  color: string;
  displayOrder: number;
}

function mapRow(row: any): FieldInspectionLink {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description || null,
    color: row.color || '#003366',
    displayOrder: row.display_order ?? 0
  };
}

export async function getFieldInspectionLinks(): Promise<FieldInspectionLink[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from('field_inspection_links').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return (data || []).map(mapRow);
}

export async function createFieldInspectionLink(params: {
  title: string;
  url: string;
  description?: string;
  color?: string;
  displayOrder?: number;
}): Promise<{ success: boolean; link?: FieldInspectionLink; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const { data, error } = await supabase
    .from('field_inspection_links')
    .insert({
      title: params.title.trim(),
      url: params.url.trim(),
      description: params.description?.trim() || null,
      color: params.color || '#003366',
      display_order: params.displayOrder ?? 0
    })
    .select()
    .single();

  if (error || !data) return { success: false, error: error?.message || 'No se pudo crear el enlace.' };
  return { success: true, link: mapRow(data) };
}

export async function deleteFieldInspectionLink(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from('field_inspection_links').delete().eq('id', id);
  return { success: !error };
}
