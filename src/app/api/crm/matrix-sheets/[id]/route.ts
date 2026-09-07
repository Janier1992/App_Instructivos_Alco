import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession, requireRole } from '@/src/lib/adminAuth';
import { getMatrixSheetById, updateMatrixSheetCotas, setMatrixSheetStatus, deleteMatrixSheet } from '@/src/lib/matrixSheetsStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const sheet = await getMatrixSheetById(id);
  if (!sheet) return NextResponse.json({ error: 'Ficha no encontrada.' }, { status: 404 });
  return NextResponse.json({ success: true, sheet });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { matrixCode, profileName, flatnessToleranceMm, eccentricityToleranceMm, cotas, publish, unpublish } = body;

    if (Array.isArray(cotas)) {
      const result = await updateMatrixSheetCotas(id, { matrixCode, profileName, flatnessToleranceMm, eccentricityToleranceMm, cotas });
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'No se pudo guardar.' }, { status: 500 });
      }
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'update',
        entityType: 'matrix_sheet',
        entityId: id,
        metadata: { cotas: cotas.length }
      });
    }

    if (publish === true) {
      await setMatrixSheetStatus(id, 'published');
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'publish',
        entityType: 'matrix_sheet',
        entityId: id
      });
    } else if (unpublish === true) {
      await setMatrixSheetStatus(id, 'draft');
      await recordAuditEvent({
        adminUserId: auth.session.sub,
        adminEmail: auth.session.email,
        action: 'unpublish',
        entityType: 'matrix_sheet',
        entityId: id
      });
    }

    const sheet = await getMatrixSheetById(id);
    if (!sheet) return NextResponse.json({ error: 'Ficha no encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true, sheet });
  } catch (err: any) {
    console.error('Error actualizando ficha de matriz:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();

  const auth = await requireRole(request, ['administrador']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deleteMatrixSheet(id);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar la ficha.' }, { status: 500 });
  }

  await recordAuditEvent({
    adminUserId: auth.session.sub,
    adminEmail: auth.session.email,
    action: 'delete',
    entityType: 'matrix_sheet',
    entityId: id
  });

  return NextResponse.json({ success: true });
}
