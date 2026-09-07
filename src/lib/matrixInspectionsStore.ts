import { getSupabaseClient } from './supabaseService';
import { getMatrixSheetById } from './matrixSheetsStore';
import { checkProfileShapeMatch, ShapeCheckResult } from './matrixInspectionVision';

const SHEETS_BUCKET = 'matrix-sheets-source';
const INSPECTIONS_BUCKET = 'matrix-inspection-photos';

const EXTENSION_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

function guessMimeTypeFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return EXTENSION_MIME_TYPES[ext] || 'image/jpeg';
}

export interface MatrixInspectionMeasurement {
  id: string;
  cotaId: string | null;
  cotaLabel: string;
  nominalValueMm: number;
  tolerancePlusMm: number;
  toleranceMinusMm: number;
  measuredValueMm: number;
  deviationMm: number;
  withinTolerance: boolean;
}

export interface MatrixInspection {
  id: string;
  sheetId: string | null;
  processSlug: string;
  matrixCode: string;
  inspectorName: string;
  shapeCheckResult: ShapeCheckResult | null;
  shapeCheckNotes: string | null;
  overallResult: 'conforme' | 'no_conforme';
  createdAt: string;
  measurements: MatrixInspectionMeasurement[];
}

function mapMeasurementRow(row: any): MatrixInspectionMeasurement {
  return {
    id: row.id,
    cotaId: row.cota_id || null,
    cotaLabel: row.cota_label,
    nominalValueMm: Number(row.nominal_value_mm),
    tolerancePlusMm: Number(row.tolerance_plus_mm),
    toleranceMinusMm: Number(row.tolerance_minus_mm),
    measuredValueMm: Number(row.measured_value_mm),
    deviationMm: Number(row.deviation_mm),
    withinTolerance: row.within_tolerance
  };
}

function mapInspectionRow(row: any, measurementRows: any[]): MatrixInspection {
  return {
    id: row.id,
    sheetId: row.sheet_id || null,
    processSlug: row.process_slug,
    matrixCode: row.matrix_code,
    inspectorName: row.inspector_name,
    shapeCheckResult: row.shape_check_result || null,
    shapeCheckNotes: row.shape_check_notes || null,
    overallResult: row.overall_result,
    createdAt: row.created_at,
    measurements: measurementRows.filter(m => m.inspection_id === row.id).map(mapMeasurementRow)
  };
}

/**
 * Crea una inspección: corre el chequeo de forma contra la imagen de
 * referencia de la ficha, calcula la desviación real de cada cota a
 * partir de lo que el inspector midió con su calibrador (nunca de la
 * foto del perfil) y guarda todo — snapshot de cada cota incluido, para
 * que el registro histórico no cambie si luego se edita la ficha.
 */
export async function createMatrixInspection(params: {
  sheetId: string;
  inspectorName: string;
  profileStoragePath: string;
  profileContentType: string;
  measurements: { cotaId: string; measuredValueMm: number; measurementPhotoStoragePath?: string }[];
}): Promise<{ success: boolean; inspection?: MatrixInspection; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase no está configurado.' };

  const sheet = await getMatrixSheetById(params.sheetId);
  if (!sheet) return { success: false, error: 'Ficha de matriz no encontrada.' };
  if (params.measurements.length === 0) return { success: false, error: 'Se requiere al menos una medición.' };

  let shapeCheckResult: ShapeCheckResult = 'no_concluyente';
  let shapeCheckNotes = 'No se pudo comparar la forma del perfil.';

  try {
    if (sheet.sourceImageStoragePath) {
      const [profileDownload, sheetDownload] = await Promise.all([
        supabase.storage.from(INSPECTIONS_BUCKET).download(params.profileStoragePath),
        supabase.storage.from(SHEETS_BUCKET).download(sheet.sourceImageStoragePath)
      ]);
      if (profileDownload.data && sheetDownload.data) {
        const profileBuffer = Buffer.from(await profileDownload.data.arrayBuffer());
        const sheetBuffer = Buffer.from(await sheetDownload.data.arrayBuffer());
        const shapeCheck = await checkProfileShapeMatch(
          profileBuffer,
          params.profileContentType,
          sheetBuffer,
          guessMimeTypeFromPath(sheet.sourceImageStoragePath)
        );
        shapeCheckResult = shapeCheck.result;
        shapeCheckNotes = shapeCheck.notes;
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Error en chequeo de forma durante la inspección:', err?.message || err);
  }

  const measurementRows = params.measurements.map(m => {
    const cota = sheet.cotas.find(c => c.id === m.cotaId);
    if (!cota) return null;
    const deviation = m.measuredValueMm - cota.nominalValueMm;
    const withinTolerance = deviation >= -cota.toleranceMinusMm && deviation <= cota.tolerancePlusMm;
    return {
      cota_id: cota.id,
      cota_label: cota.label,
      nominal_value_mm: cota.nominalValueMm,
      tolerance_plus_mm: cota.tolerancePlusMm,
      tolerance_minus_mm: cota.toleranceMinusMm,
      measured_value_mm: m.measuredValueMm,
      deviation_mm: deviation,
      within_tolerance: withinTolerance,
      measurement_photo_storage_path: m.measurementPhotoStoragePath || null
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (measurementRows.length === 0) {
    return { success: false, error: 'Ninguna de las mediciones corresponde a una cota válida de esta ficha.' };
  }

  const overallResult: 'conforme' | 'no_conforme' = measurementRows.every(r => r.within_tolerance) ? 'conforme' : 'no_conforme';

  const { data: inspectionRow, error: insertError } = await supabase
    .from('matrix_inspections')
    .insert({
      sheet_id: sheet.id,
      process_slug: sheet.processSlug,
      matrix_code: sheet.matrixCode,
      inspector_name: params.inspectorName.trim(),
      profile_photo_storage_path: params.profileStoragePath,
      shape_check_result: shapeCheckResult,
      shape_check_notes: shapeCheckNotes,
      overall_result: overallResult
    })
    .select()
    .single();

  if (insertError || !inspectionRow) {
    return { success: false, error: insertError?.message || 'No se pudo guardar la inspección.' };
  }

  const { data: insertedMeasurements, error: measurementsError } = await supabase
    .from('matrix_inspection_measurements')
    .insert(measurementRows.map(r => ({ ...r, inspection_id: inspectionRow.id })))
    .select();

  if (measurementsError) {
    console.warn('⚠️ Error guardando mediciones de inspección:', measurementsError.message);
  }

  return { success: true, inspection: mapInspectionRow(inspectionRow, insertedMeasurements || []) };
}

export async function getMatrixInspections(processSlug?: string): Promise<MatrixInspection[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('matrix_inspections').select('*').order('created_at', { ascending: false });
    if (processSlug) query = query.eq('process_slug', processSlug);

    const { data: inspectionRows, error } = await query;
    if (error || !inspectionRows || inspectionRows.length === 0) return [];

    const { data: measurementRows } = await supabase
      .from('matrix_inspection_measurements')
      .select('*')
      .in('inspection_id', inspectionRows.map(r => r.id));

    return inspectionRows.map(row => mapInspectionRow(row, measurementRows || []));
  } catch (err: any) {
    console.warn('⚠️ Error cargando inspecciones de matriz:', err?.message || err);
    return [];
  }
}
