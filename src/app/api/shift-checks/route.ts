import { NextRequest, NextResponse } from 'next/server';
import { recordShiftCheck, Shift } from '@/src/lib/shiftChecksStore';

const VALID_SHIFTS: Shift[] = ['manana', 'tarde', 'noche'];

// Pública — registrar un autocontrol de turno. Sin autenticación, igual que
// el Buzón de Mejora y los comentarios de Principal: cualquiera en planta
// puede dejar constancia dando su nombre, sin necesidad de cuenta.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processSlug, shift, collaboratorName, results, notes } = body;

    if (
      typeof processSlug !== 'string' || !processSlug ||
      !VALID_SHIFTS.includes(shift) ||
      typeof collaboratorName !== 'string' || !collaboratorName.trim() ||
      !Array.isArray(results) || results.length === 0 ||
      !results.every((r: any) => typeof r?.itemId === 'string' && typeof r?.label === 'string' && typeof r?.passed === 'boolean')
    ) {
      return NextResponse.json({ error: 'Datos de autocontrol incompletos o inválidos.' }, { status: 400 });
    }

    const result = await recordShiftCheck({ processSlug, shift, collaboratorName, results, notes });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo registrar el autocontrol.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, check: result.check });
  } catch (err: any) {
    console.error('Error registrando autocontrol de turno:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
