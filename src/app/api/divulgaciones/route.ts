import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getDivulgaciones, createDivulgacion, validateDivulgacionInput, DivulgacionInput } from '@/src/lib/divulgacionStore';

/** Pública — lista de divulgaciones (planilla de asistencia) del módulo de Control Calidad, con su número de asistentes. */
export async function GET() {
  await ensureHydrated();
  try {
    const divulgaciones = await getDivulgaciones();
    return NextResponse.json({ success: true, divulgaciones }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('Error listando divulgaciones:', err);
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar las divulgaciones.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await ensureHydrated();
  try {
    const body: DivulgacionInput = await request.json();
    const invalid = validateDivulgacionInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const result = await createDivulgacion(body);
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo guardar la divulgación.' }, { status: 500 });
    return NextResponse.json({ success: true, divulgacion: result.divulgacion });
  } catch (err: any) {
    console.error('Error creando divulgación:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
