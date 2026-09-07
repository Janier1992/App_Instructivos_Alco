import { getSupabaseClient } from './supabaseService';
import { extractCotasFromSheetImage, ExtractedCota } from './matrixSheetExtraction';

const BUCKET = 'matrix-sheets-source';

export type MatrixSheetStatus = 'draft' | 'published';

export interface MatrixSheetCota {
  id: string;
  label: string;
  nominalValueMm: number;
  tolerancePlusMm: number;
  toleranceMinusMm: number;
  displayOrder: number;
}

export interface MatrixSheet {
  id: string;
  processSlug: string;
  matrixCode: string;
  profileName: string;
  sourceImageStoragePath: string | null;
  flatnessToleranceMm: number | null;
  eccentricityToleranceMm: number | null;
  status: MatrixSheetStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  cotas: MatrixSheetCota[];
}

function mapSheetRow(row: any, cotaRows: any[]): MatrixSheet {
  return {
    id: row.id,
    processSlug: row.process_slug,
    matrixCode: row.matrix_code,
    profileName: row.profile_name,
    sourceImageStoragePath: row.source_image_storage_path || null,
    flatnessToleranceMm: row.flatness_tolerance_mm !== null ? Number(row.flatness_tolerance_mm) : null,
    eccentricityToleranceMm: row.eccentricity_tolerance_mm !== null ? Number(row.eccentricity_tolerance_mm) : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || null,
    cotas: cotaRows
      .filter(c => c.sheet_id === row.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map(mapCotaRow)
  };
}

function mapCotaRow(row: any): MatrixSheetCota {
  return {
    id: row.id,
    label: row.label,
    nominalValueMm: Number(row.nominal_value_mm),
    tolerancePlusMm: Number(row.tolerance_plus_mm),
    toleranceMinusMm: Number(row.tolerance_minus_mm),
    displayOrder: row.display_order
  };
}

async function insertCotas(supabase: ReturnType<typeof getSupabaseClient>, sheetId: string, cotas: ExtractedCota[]) {
  if (!supabase || cotas.length === 0) return;
  await supabase.from('matrix_sheet_cotas').insert(
    cotas.map((c, idx) => ({
      sheet_id: sheetId,
      label: c.label,
      nominal_value_mm: c.nominalValueMm,
      tolerance_plus_mm: c.tolerancePlusMm,
      tolerance_minus_mm: c.toleranceMinusMm,
      display_order: idx
    }))
  );
}

/**
 * Convierte la foto de una ficha de matriz ya subida a Storage en un
 * borrador con las cotas extraídas por visión — Calidad debe revisar y
 * publicar antes de que aparezca en el selector de inspección en planta.
 */
export async function createDraftMatrixSheet(params: {
  processSlug: string;
  matrixCode: string;
  profileName: string;
  storagePath: string;
  contentType: string;
  createdBy?: string;
}): Promise<{ success: boolean; sheet?: MatrixSheet; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const { data: downloaded, error: downloadError } = await supabase.storage.from(BUCKET).download(params.storagePath);
    if (downloadError || !downloaded) {
      return { success: false, error: 'No se pudo leer la imagen cargada desde Storage.' };
    }
    const imageBuffer = Buffer.from(await downloaded.arrayBuffer());

    const extraction = await extractCotasFromSheetImage(imageBuffer, params.contentType);

    const { data, error } = await supabase
      .from('matrix_technical_sheets')
      .insert({
        process_slug: params.processSlug,
        matrix_code: params.matrixCode.trim(),
        profile_name: params.profileName.trim(),
        source_image_storage_path: params.storagePath,
        flatness_tolerance_mm: extraction.flatnessToleranceMm,
        eccentricity_tolerance_mm: extraction.eccentricityToleranceMm,
        status: 'draft',
        created_by: params.createdBy || null
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'No se pudo guardar la ficha.' };
    }

    await insertCotas(supabase, data.id, extraction.cotas);

    const sheet = await getMatrixSheetById(data.id);
    return { success: true, sheet: sheet || undefined };
  } catch (err: any) {
    console.warn('⚠️ Error creando ficha de matriz:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function getMatrixSheets(processSlug?: string, onlyPublished = false): Promise<MatrixSheet[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('matrix_technical_sheets').select('*').order('created_at', { ascending: false });
    if (processSlug) query = query.eq('process_slug', processSlug);
    if (onlyPublished) query = query.eq('status', 'published');

    const { data: sheetRows, error } = await query;
    if (error || !sheetRows || sheetRows.length === 0) return [];

    const { data: cotaRows } = await supabase
      .from('matrix_sheet_cotas')
      .select('*')
      .in('sheet_id', sheetRows.map(r => r.id));

    return sheetRows.map(row => mapSheetRow(row, cotaRows || []));
  } catch (err: any) {
    console.warn('⚠️ Error cargando fichas de matriz:', err?.message || err);
    return [];
  }
}

export async function getMatrixSheetById(id: string): Promise<MatrixSheet | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: row, error } = await supabase.from('matrix_technical_sheets').select('*').eq('id', id).maybeSingle();
    if (error || !row) return null;

    const { data: cotaRows } = await supabase.from('matrix_sheet_cotas').select('*').eq('sheet_id', id);
    return mapSheetRow(row, cotaRows || []);
  } catch (err: any) {
    console.warn('⚠️ Error cargando ficha de matriz:', err?.message || err);
    return null;
  }
}

/**
 * Reemplaza por completo las cotas de una ficha (Calidad corrigiendo lo
 * extraído por visión antes de publicar) y actualiza las tolerancias
 * generales de planeidad/excentricidad.
 */
export async function updateMatrixSheetCotas(
  id: string,
  updates: {
    matrixCode?: string;
    profileName?: string;
    flatnessToleranceMm?: number | null;
    eccentricityToleranceMm?: number | null;
    cotas: { label: string; nominalValueMm: number; tolerancePlusMm: number; toleranceMinusMm: number }[];
  }
): Promise<{ success: boolean; sheet?: MatrixSheet; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  try {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.matrixCode !== undefined) patch.matrix_code = updates.matrixCode.trim();
    if (updates.profileName !== undefined) patch.profile_name = updates.profileName.trim();
    if (updates.flatnessToleranceMm !== undefined) patch.flatness_tolerance_mm = updates.flatnessToleranceMm;
    if (updates.eccentricityToleranceMm !== undefined) patch.eccentricity_tolerance_mm = updates.eccentricityToleranceMm;

    const { error: updateError } = await supabase.from('matrix_technical_sheets').update(patch).eq('id', id);
    if (updateError) return { success: false, error: updateError.message };

    await supabase.from('matrix_sheet_cotas').delete().eq('sheet_id', id);
    await insertCotas(supabase, id, updates.cotas);

    const sheet = await getMatrixSheetById(id);
    return { success: true, sheet: sheet || undefined };
  } catch (err: any) {
    console.warn('⚠️ Error actualizando cotas de ficha de matriz:', err?.message || err);
    return { success: false, error: err?.message || 'Error desconocido.' };
  }
}

export async function setMatrixSheetStatus(id: string, status: MatrixSheetStatus): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'published') patch.published_at = new Date().toISOString();

  const { error } = await supabase.from('matrix_technical_sheets').update(patch).eq('id', id);
  if (error) {
    console.warn('⚠️ No se pudo cambiar el estado de la ficha de matriz:', error.message);
    return { success: false };
  }
  return { success: true };
}

export async function deleteMatrixSheet(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false };

  try {
    const { data: row } = await supabase.from('matrix_technical_sheets').select('source_image_storage_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('matrix_technical_sheets').delete().eq('id', id);
    if (error) {
      console.warn('⚠️ No se pudo eliminar la ficha de matriz:', error.message);
      return { success: false };
    }
    if (row?.source_image_storage_path) {
      await supabase.storage.from(BUCKET).remove([row.source_image_storage_path]);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Error eliminando ficha de matriz:', err?.message || err);
    return { success: false };
  }
}
