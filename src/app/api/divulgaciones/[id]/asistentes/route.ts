import { NextRequest, NextResponse } from 'next/server';
import { addAsistente, validateAsistenteInput, AsistenteInput } from '@/src/lib/divulgacionStore';

/** Pública — registra la fila de asistencia de una persona (nombre, cédula, proceso o sección y firma dibujada en la app). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body: AsistenteInput = await request.json();
    const invalid = validateAsistenteInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const result = await addAsistente(id, body);
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo registrar la asistencia.' }, { status: 409 });
    return NextResponse.json({ success: true, divulgacion: result.divulgacion });
  } catch (err: any) {
    console.error('Error registrando asistencia:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
