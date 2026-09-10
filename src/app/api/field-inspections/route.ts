import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getFieldInspections, createFieldInspections, FieldInspectionInput } from '@/src/lib/fieldInspectionsStore';

/** Pública — consulta de las inspecciones de campo registradas. */
export async function GET(request: NextRequest) {
  await ensureHydrated();

  const estado = request.nextUrl.searchParams.get('estado') || undefined;
  const areaProceso = request.nextUrl.searchParams.get('areaProceso') || undefined;
  const search = request.nextUrl.searchParams.get('search') || undefined;
  const inspections = await getFieldInspections({ estado, areaProceso, search, limit: search ? 1000 : 200 });
  return NextResponse.json({ success: true, inspections });
}

/**
 * Pública — registro del formulario de inspección directamente desde el
 * módulo de Control Calidad, sin necesidad de entrar al CRM. Editar o
 * eliminar un registro sí requiere el Portal de Administración
 * (ver /api/crm/field-inspections).
 */
export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const body: FieldInspectionInput = await request.json();

    if (!body.areaProceso?.trim() || !body.op?.trim()) {
      return NextResponse.json({ error: 'Se requiere área de proceso y orden de producción (OP).' }, { status: 400 });
    }

    const result = await createFieldInspections(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudieron guardar las inspecciones.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, inspections: result.inspections, nonConformityCreated: result.nonConformityCreated });
  } catch (err: any) {
    console.error('Error creando inspecciones de campo:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
