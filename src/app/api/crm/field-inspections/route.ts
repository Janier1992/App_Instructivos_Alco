import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { getFieldInspections, createFieldInspections, deleteFieldInspections, deleteFieldInspectionsMatchingBatch, FieldInspectionInput } from '@/src/lib/fieldInspectionsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const estado = request.nextUrl.searchParams.get('estado') || undefined;
  const areaProceso = request.nextUrl.searchParams.get('areaProceso') || undefined;
  const inspections = await getFieldInspections({ estado, areaProceso });
  return NextResponse.json({ success: true, inspections });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const body: FieldInspectionInput = await request.json();

    if (!body.areaProceso?.trim() || !body.op?.trim()) {
      return NextResponse.json({ error: 'Se requiere área de proceso y orden de producción (OP).' }, { status: 400 });
    }

    const result = await createFieldInspections(body, auth.session.sub);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudieron guardar las inspecciones.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'field_inspection',
      entityId: result.inspections?.[0]?.id,
      metadata: { count: result.inspections?.length || 0, op: body.op, estado: body.estado, nonConformityCreated: result.nonConformityCreated }
    });

    return NextResponse.json({ success: true, inspections: result.inspections, nonConformityCreated: result.nonConformityCreated });
  } catch (err: any) {
    console.error('Error creando inspecciones de campo:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * Borrado múltiple. El cliente envía { ids: string[] } para borrar una
 * selección puntual, o { deleteAll: true, search?: string } para borrar UN
 * LOTE (hasta 500) de los registros que coincidan con la búsqueda (o del
 * total de la tabla si search viene vacío) — sin importar cuántos estén
 * cargados en el navegador. El cliente debe llamar repetidamente mientras
 * `done` sea false; esto evita que una tabla de decenas de miles de filas
 * agote el timeout de la función serverless en una sola invocación.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();

  if (body?.deleteAll) {
    const search: string | undefined = typeof body.search === 'string' ? body.search : undefined;
    const result = await deleteFieldInspectionsMatchingBatch(search);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudieron eliminar las inspecciones.' }, { status: 500 });
    }

    if (result.deleted > 0) {
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'delete',
        entityType: 'field_inspection',
        entityId: 'bulk-all',
        metadata: { count: result.deleted, search: search || null, done: result.done }
      });
    }

    return NextResponse.json({ success: true, deleted: result.deleted, done: result.done });
  }

  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Se requiere un arreglo de ids.' }, { status: 400 });
  }

  const result = await deleteFieldInspections(ids);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudieron eliminar las inspecciones.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'field_inspection',
    entityId: ids.join(','),
    metadata: { count: ids.length }
  });

  return NextResponse.json({ success: true });
}
