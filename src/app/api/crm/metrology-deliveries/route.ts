import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { requireSession } from '@/src/lib/adminAuth';
import { getMetrologyDeliveries, createMetrologyDelivery, MetrologyDeliveryInput } from '@/src/lib/metrologyDeliveriesStore';
import { recordAuditEvent } from '@/src/lib/auditLog';

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const deliveries = await getMetrologyDeliveries();
  return NextResponse.json({ success: true, deliveries });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  try {
    const body: MetrologyDeliveryInput = await request.json();

    if (!body.area?.trim() || !body.sede?.trim() || !body.receptorNombre?.trim() || !body.receptorCedula?.trim() || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Se requiere área, sede, receptor y al menos un equipo.' }, { status: 400 });
    }

    const result = await createMetrologyDelivery(body, auth.session.sub);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar el acta de entrega.' }, { status: 500 });
    }

    await recordAuditEvent({
      adminUserId: auth.session.sub,
      adminEmail: auth.session.email,
      action: 'create',
      entityType: 'metrology_delivery',
      entityId: result.delivery?.id,
      metadata: { receptor: body.receptorNombre, area: body.area }
    });

    return NextResponse.json({ success: true, delivery: result.delivery });
  } catch (err: any) {
    console.error('Error creando acta de entrega de Metrología Pro:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
