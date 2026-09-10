import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { bulkCreateFieldInspections, FieldInspectionInput } from '@/src/lib/fieldInspectionsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export const maxDuration = 60;

/**
 * Carga masiva desde Excel — el cliente ya parseó y validó las filas. Sin
 * límite de filas: bulkCreateFieldInspections inserta en lotes internamente
 * para que un archivo grande no falle por el tamaño de un único INSERT.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { rows }: { rows: FieldInspectionInput[] } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No hay filas para insertar.' }, { status: 400 });
  }

  const result = await bulkCreateFieldInspections(rows, auth.session.sub);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo completar la carga masiva.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'create',
    entityType: 'field_inspection_bulk',
    metadata: { count: result.count }
  });

  return NextResponse.json({ success: true, count: result.count });
}
