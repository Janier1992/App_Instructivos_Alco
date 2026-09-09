import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getMetrologyDeliveries, createMetrologyDelivery, MetrologyDeliveryInput } from '@/src/lib/metrologyDeliveriesStore';

/** Pública — consulta de las actas de entrega de Metrología Pro. */
export async function GET() {
  await ensureHydrated();
  const deliveries = await getMetrologyDeliveries(200);
  return NextResponse.json({ success: true, deliveries });
}

/**
 * Pública — registro del acta de entrega directamente desde el módulo de
 * Control Calidad, sin necesidad de entrar al CRM. Editar o eliminar un
 * registro sí requiere el Portal de Administración
 * (ver /api/crm/metrology-deliveries).
 */
export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const body: MetrologyDeliveryInput = await request.json();

    if (!body.area?.trim() || !body.sede?.trim() || !body.receptorNombre?.trim() || !body.receptorCedula?.trim() || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Se requiere área, sede, receptor y al menos un equipo.' }, { status: 400 });
    }

    const result = await createMetrologyDelivery(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo guardar el acta de entrega.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, delivery: result.delivery });
  } catch (err: any) {
    console.error('Error creando acta de entrega de Metrología Pro:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
