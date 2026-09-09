import { getSupabaseClient } from './supabaseService';

const CERTIFICATE_BUCKET = 'metrology-calibration-certificates';
const CERTIFICATE_URL_TTL_SECONDS = 6 * 60 * 60;
const CERTIFICATE_URL_REUSE_MARGIN_MS = 10 * 60 * 1000;

export interface MetrologyCalibration {
  id: string;
  processSlug: string;
  tool: string;
  code: string;
  lastDate: string | null;
  dueDate: string | null;
  status: 'Vigente' | 'Vencido' | 'Próximo' | 'Mantenimiento';
  certificateNumber: string | null;
  certificateStoragePath: string | null;
  createdAt: string;
}

function mapRow(row: any): MetrologyCalibration {
  return {
    id: row.id,
    processSlug: row.process_slug,
    tool: row.tool,
    code: row.code,
    lastDate: row.last_date || null,
    dueDate: row.due_date || null,
    status: row.status || 'Vigente',
    certificateNumber: row.certificate_number || null,
    certificateStoragePath: row.certificate_storage_path || null,
    createdAt: row.created_at
  };
}

export interface MetrologyCalibrationInput {
  tool: string;
  code: string;
  lastDate?: string;
  dueDate?: string;
  status?: 'Vigente' | 'Vencido' | 'Próximo' | 'Mantenimiento';
  certificateNumber?: string;
  certificateStoragePath?: string;
}

function toDbRow(input: MetrologyCalibrationInput, createdBy?: string) {
  return {
    process_slug: 'control-calidad',
    tool: (input.tool || '').toUpperCase(),
    code: (input.code || '').toUpperCase(),
    last_date: input.lastDate || null,
    due_date: input.dueDate || null,
    status: input.status || 'Vigente',
    certificate_number: input.certificateNumber || null,
    certificate_storage_path: input.certificateStoragePath || null,
    created_by: createdBy || null
  };
}

export async function createMetrologyCalibration(
  input: MetrologyCalibrationInput,
  createdBy?: string
): Promise<{ success: boolean; calibration?: MetrologyCalibration; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await supabase.from('metrology_calibrations').insert(toDbRow(input, createdBy)).select().single();
    if (error || !data) return { success: false, error: error?.message || 'No se pudo guardar el instrumento.' };
    return { success: true, calibration: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function getMetrologyCalibrations(limit = 500): Promise<MetrologyCalibration[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('metrology_calibrations').select('*').order('due_date', { ascending: true }).limit(limit);
    if (error) {
      console.warn('⚠️ No se pudieron cargar los instrumentos de calibración:', error.message);
      return [];
    }
    return (data || []).map(mapRow);
  } catch (err: any) {
    console.warn('⚠️ Error cargando instrumentos de calibración:', err?.message || err);
    return [];
  }
}

export async function getMetrologyCalibrationById(id: string): Promise<MetrologyCalibration | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from('metrology_calibrations').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export async function updateMetrologyCalibration(
  id: string,
  input: MetrologyCalibrationInput
): Promise<{ success: boolean; calibration?: MetrologyCalibration; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const patch = toDbRow(input);
  delete (patch as any).created_by;
  (patch as any).updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase.from('metrology_calibrations').update(patch).eq('id', id).select().single();
    if (error || !data) return { success: false, error: error?.message || 'No se pudo actualizar.' };
    return { success: true, calibration: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function deleteMetrologyCalibration(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from('metrology_calibrations').delete().eq('id', id);
  if (error) {
    console.warn('⚠️ No se pudo eliminar el instrumento de calibración:', error.message);
    return { success: false };
  }
  return { success: true };
}

const certificateUrlCache = new Map<string, { url: string; expiresAtMs: number }>();

/** URL firmada reutilizable del certificado — mismo patrón de cache que fotos/videos del resto de la app. */
export async function getMetrologyCalibrationCertificateUrl(calibration: MetrologyCalibration): Promise<string | null> {
  if (!calibration.certificateStoragePath) return null;

  const cached = certificateUrlCache.get(calibration.certificateStoragePath);
  if (cached && cached.expiresAtMs > Date.now() + CERTIFICATE_URL_REUSE_MARGIN_MS) return cached.url;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(CERTIFICATE_BUCKET).createSignedUrl(calibration.certificateStoragePath, CERTIFICATE_URL_TTL_SECONDS);
  if (error || !data) return null;

  certificateUrlCache.set(calibration.certificateStoragePath, { url: data.signedUrl, expiresAtMs: Date.now() + CERTIFICATE_URL_TTL_SECONDS * 1000 });
  return data.signedUrl;
}
