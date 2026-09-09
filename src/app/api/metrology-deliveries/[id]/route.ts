import { NextRequest, NextResponse } from 'next/server';
import { getMetrologyDeliveryById } from '@/src/lib/metrologyDeliveriesStore';

/** Pública — detalle de un acta de entrega (incluye firmas), para ver o exportar a PDF. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const delivery = await getMetrologyDeliveryById(id);
  if (!delivery) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, delivery });
}
