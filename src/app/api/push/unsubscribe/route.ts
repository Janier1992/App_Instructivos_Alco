import { NextRequest, NextResponse } from 'next/server';
import { removePushSubscription } from '@/src/lib/pushSubscriptionsStore';

export async function POST(request: NextRequest) {
  try {
    const { processSlug, endpoint } = await request.json();

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'Se requiere endpoint.' }, { status: 400 });
    }

    // Sin processSlug elimina la suscripción de TODOS los procesos para ese
    // endpoint (equivalente a "no notificarme nunca más en este dispositivo").
    await removePushSubscription(processSlug || null, endpoint);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error cancelando suscripción push:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
