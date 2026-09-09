import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getMetrologyCalibrations, createMetrologyCalibration, MetrologyCalibrationInput } from '@/src/lib/metrologyCalibrationsStore';

/** Pública — consulta del cronograma maestro de calibración de Metrología Pro. */
export async function GET() {
  await ensureHydrated();
  const calibrations = await getMetrologyCalibrations(500);
  return NextResponse.json({ success: true, calibrations });
}

/**
 * Pública — vincula un instrumento al cronograma directamente desde el
 * módulo de Control Calidad, sin necesidad de entrar al CRM. Editar o
 * eliminar sí requiere el Portal de Administración
 * (ver /api/crm/metrology-calibrations).
 */
export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const body: MetrologyCalibrationInput = await request.json();

    if (!body.tool?.trim() || !body.code?.trim()) {
      return NextResponse.json({ error: 'Se requiere el nombre del instrumento y el código interno.' }, { status: 400 });
    }

    const result = await createMetrologyCalibration(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar el instrumento.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, calibration: result.calibration });
  } catch (err: any) {
    console.error('Error creando instrumento de calibración de Metrología Pro:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
