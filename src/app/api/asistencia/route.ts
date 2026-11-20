import { NextRequest, NextResponse } from 'next/server';
import { addAsistente, getDivulgacionIdByToken, getRecentDivulgacionesPublic, validateAsistenteInput, AsistenteInput } from '@/src/lib/divulgacionStore';
import { getClientKey, isRateLimited } from '@/src/lib/rateLimit';

// Una persona que registra a varios compañeros desde un mismo equipo no debería toparse con el límite.
const MAX_REGISTRATIONS_PER_WINDOW = 120;

/** Pública — divulgaciones recientes del enlace único de registro (tema, fecha y responsable); nunca los asistentes. */
export async function GET() {
  try {
    const divulgaciones = await getRecentDivulgacionesPublic();
    return NextResponse.json({ success: true, divulgaciones }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar las divulgaciones.' }, { status: 500 });
  }
}

/** Pública — registra la asistencia de una persona a la divulgación elegida (nombre, cédula, proceso o sección y firma). */
export async function POST(request: NextRequest) {
  if (isRateLimited(`asistencia:${getClientKey(request.headers)}`, MAX_REGISTRATIONS_PER_WINDOW)) {
    return NextResponse.json({ error: 'Demasiados registros desde este equipo. Intenta de nuevo en unos minutos.' }, { status: 429 });
  }

  try {
    const body: AsistenteInput & { token?: string } = await request.json();
    const divulgacionId = await getDivulgacionIdByToken(String(body.token || ''));
    if (!divulgacionId) return NextResponse.json({ error: 'Elige la divulgación a la que asististe.' }, { status: 404 });

    const input: AsistenteInput = { nombre: body.nombre, procesoSeccion: body.procesoSeccion, firma: body.firma, cedula: String(body.cedula || '').replace(/\D/g, '') };
    const invalid = validateAsistenteInput(input);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const result = await addAsistente(divulgacionId, input);
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo registrar la asistencia.' }, { status: 409 });
    // Solo se confirma el registro: la respuesta no incluye datos de los demás asistentes.
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error registrando asistencia desde el enlace:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
