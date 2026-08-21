import { NextResponse } from 'next/server';

// Pública — el navegador necesita la llave pública VAPID para suscribirse
// (pushManager.subscribe). La llave privada nunca sale del servidor.
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'Las notificaciones push no están configuradas.' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
