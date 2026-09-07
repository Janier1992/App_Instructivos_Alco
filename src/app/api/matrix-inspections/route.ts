import { NextRequest, NextResponse } from 'next/server';
import { createMatrixInspection } from '@/src/lib/matrixInspectionsStore';

// El chequeo de forma llama a Gemini con dos imágenes — puede tardar
// varios segundos.
export const maxDuration = 30;

/** Pública, sin cuenta de usuario — mismo patrón que autocertificaciones. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetId, inspectorName, profileStoragePath, profileContentType, measurements } = body;

    if (!sheetId || typeof inspectorName !== 'string' || !inspectorName.trim() || !profileStoragePath) {
      return NextResponse.json({ error: 'Faltan datos requeridos (ficha, inspector o foto del perfil).' }, { status: 400 });
    }
    if (
      !Array.isArray(measurements) || measurements.length === 0 ||
      !measurements.every((m: any) => typeof m?.cotaId === 'string' && typeof m?.measuredValueMm === 'number' && Number.isFinite(m.measuredValueMm))
    ) {
      return NextResponse.json({ error: 'Se requiere al menos una medición válida.' }, { status: 400 });
    }

    const result = await createMatrixInspection({
      sheetId,
      inspectorName,
      profileStoragePath,
      profileContentType: profileContentType || 'image/jpeg',
      measurements
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo registrar la inspección.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, inspection: result.inspection });
  } catch (err: any) {
    console.error('Error creando inspección de matriz:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
