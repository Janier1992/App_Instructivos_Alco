import { NextRequest, NextResponse } from 'next/server';
import { addPushSubscription } from '@/src/lib/pushSubscriptionsStore';

// Pública, sin cuenta de usuario: cualquiera puede activar notificaciones
// para un proceso desde su propio dispositivo.
export async function POST(request: NextRequest) {
  try {
    const { processSlug, subscription } = await request.json();

    if (!processSlug || typeof processSlug !== 'string') {
      return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
    }
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'La suscripción push no tiene el formato esperado.' }, { status: 400 });
    }

    const success = await addPushSubscription(processSlug, subscription);
    if (!success) {
      return NextResponse.json({ error: 'No se pudo guardar la suscripción.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error suscribiendo a notificaciones push:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
