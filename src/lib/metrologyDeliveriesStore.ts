import { getSupabaseClient } from './supabaseService';

export interface MetrologyDeliveryItem {
  equipoNombre: string;
  marca: string;
  cantidad: number;
  observaciones: string;
  codigo?: string;
  longitud?: string;
}

export interface MetrologyDelivery {
  id: string;
  processSlug: string;
  fecha: string;
  area: string;
  sede: string;
  receptorNombre: string;
  receptorCedula: string;
  receptorCargo: string | null;
  items: MetrologyDeliveryItem[];
  firmaEntrega: string | null;
  firmaRecibe: string | null;
  createdAt: string;
}

function mapRow(row: any): MetrologyDelivery {
  return {
    id: row.id,
    processSlug: row.process_slug,
    fecha: row.fecha,
    area: row.area,
    sede: row.sede,
    receptorNombre: row.receptor_nombre,
    receptorCedula: row.receptor_cedula,
    receptorCargo: row.receptor_cargo || null,
    items: row.items || [],
    firmaEntrega: row.firma_entrega || null,
    firmaRecibe: row.firma_recibe || null,
    createdAt: row.created_at
  };
}

export interface MetrologyDeliveryInput {
  fecha: string;
  area: string;
  sede: string;
  receptorNombre: string;
  receptorCedula: string;
  receptorCargo?: string;
  items: MetrologyDeliveryItem[];
  firmaEntrega?: string;
  firmaRecibe?: string;
}

function toDbRow(input: MetrologyDeliveryInput, createdBy?: string) {
  return {
    process_slug: 'control-calidad',
    fecha: input.fecha || new Date().toISOString().split('T')[0],
    area: (input.area || '').toUpperCase(),
    sede: (input.sede || '').toUpperCase(),
    receptor_nombre: (input.receptorNombre || '').toUpperCase(),
    receptor_cedula: input.receptorCedula || '',
    receptor_cargo: (input.receptorCargo || '').toUpperCase() || null,
    items: (input.items || []).map(item => ({ ...item, equipoNombre: (item.equipoNombre || '').toUpperCase() })),
    firma_entrega: input.firmaEntrega || null,
    firma_recibe: input.firmaRecibe || null,
    created_by: createdBy || null
  };
}

export async function createMetrologyDelivery(
  input: MetrologyDeliveryInput,
  createdBy?: string
): Promise<{ success: boolean; delivery?: MetrologyDelivery; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase.from('metrology_deliveries').insert(toDbRow(input, createdBy)).select().single();
    if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar el acta de entrega.' };
    return { success: true, delivery: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function getMetrologyDeliveries(limit = 500): Promise<MetrologyDelivery[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('metrology_deliveries').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) {
      console.warn('⚠️ No se pudieron cargar las actas de entrega:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando actas de entrega:', err?.message || err);
    return [];
  }
}

export async function getMetrologyDeliveryById(id: string): Promise<MetrologyDelivery | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from('metrology_deliveries').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export async function updateMetrologyDelivery(
  id: string,
  input: MetrologyDeliveryInput
): Promise<{ success: boolean; delivery?: MetrologyDelivery; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const patch = toDbRow(input);
  delete (patch as any).created_by;
  (patch as any).updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase.from('metrology_deliveries').update(patch).eq('id', id).select().single();
    if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar.' };
    return { success: true, delivery: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function deleteMetrologyDelivery(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from('metrology_deliveries').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ No se pudo eliminar el acta de entrega:', error.message);
    return { success: false };
  }
  return { success: true };
}
