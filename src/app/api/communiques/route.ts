import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getCommuniques, createCommunique, validateCommuniqueInput, CommuniqueInput } from '@/src/lib/communiqueStore';

/** Pública — lista de comunicados y procedimientos, desde el módulo de Control Calidad. */
export async function GET() {
  await ensureHydrated();
  try {
    const communiques = await getCommuniques();
    return NextResponse.json({ success: true, communiques }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('Error listando comunicados:', err);
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar los comunicados.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const body: CommuniqueInput = await request.json();
    const validationError = validateCommuniqueInput(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await createCommunique(body);
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo guardar el comunicado.' }, { status: 500 });

    return NextResponse.json({ success: true, communique: result.communique });
  } catch (err: any) {
    console.error('Error creando comunicado:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
