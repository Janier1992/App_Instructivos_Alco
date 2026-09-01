import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getShiftCheckItems, createShiftCheckItem } from '@/src/lib/shiftChecksStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  // El CRM ve también los inactivos, para poder reactivarlos.
  const items = await getShiftCheckItems(processSlug, false);
  return NextResponse.json({ success: true, items });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const { processSlug, label, displayOrder } = await request.json();

    if (typeof processSlug !== 'string' || !processSlug || !label?.trim()) {
      return NextResponse.json({ error: 'Se requiere processSlug y label.' }, { status: 400 });
    }

    const result = await createShiftCheckItem({
      processSlug,
      label,
      displayOrder,
      createdBy: auth.session.sub
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo crear el ítem.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'shift_check_item',
      entityId: result.item?.id,
      metadata: { processSlug, label: label.trim() }
    });

    return NextResponse.json({ success: true, item: result.item });
  } catch (err: any) {
    console.error('Error creando ítem de autocontrol:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
