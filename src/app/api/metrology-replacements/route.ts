import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getMetrologyReplacements, createMetrologyReplacement, MetrologyReplacementInput } from '@/src/lib/metrologyReplacementsStore';

/** Pública — consulta de los registros de reposición y baja de Metrología Pro. */
export async function GET() {
  await ensureHydrated();
  const replacements = await getMetrologyReplacements(200);
  return NextResponse.json({ success: true, replacements });
}

/**
 * Pública — registro directamente desde el módulo de Control Calidad,
 * sin necesidad de entrar al CRM. Editar o eliminar un registro sí
 * requiere el Portal de Administración (ver /api/crm/metrology-replacements).
 */
export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const body: MetrologyReplacementInput = await request.json();

    if (!body.nombreEquipo?.trim() || !body.codigo?.trim() || !body.areaUso?.trim() || !body.nombreResponsable?.trim() || !body.motivoReposicion?.trim()) {
      return NextResponse.json({ error: 'Se requiere nombre del equipo, código, área de uso, responsable y motivo de reposición.' }, { status: 400 });
    }

    const result = await createMetrologyReplacement(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar el registro.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, replacement: result.replacement });
  } catch (err: any) {
    console.error('Error creando registro de reposición/baja de Metrología Pro:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
