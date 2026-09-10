import { NextRequest, NextResponse } from 'next/server';
import { updateFieldInspection, FieldInspectionInput } from '@/src/lib/fieldInspectionsStore';

/**
 * Pública — permite corregir un registro directamente desde el módulo de
 * Control Calidad (ej. un dato mal digitado), sin necesidad de entrar al
 * CRM. Eliminar un registro sigue siendo exclusivo del Portal de
 * Administración (ver /api/crm/field-inspections/[id], que además tiene
 * DELETE).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: FieldInspectionInput = await request.json();

  if (!body.areaProceso?.trim() || !body.op?.trim()) {
    return NextResponse.json({ error: 'Se requiere área de proceso y orden de producción (OP).' }, { status: 400 });
  }

  const result = await updateFieldInspection(id, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo actualizar la inspección.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, inspection: result.inspection });
}
