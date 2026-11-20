import { NextRequest, NextResponse } from 'next/server';
import { deleteAsistente } from '@/src/lib/divulgacionStore';

/** Quita una fila de asistencia (por ejemplo, un registro con datos equivocados). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; asistenteId: string }> }) {
  const { id, asistenteId } = await params;
  const result = await deleteAsistente(id, asistenteId);
  if (!result.success) return NextResponse.json({ error: 'No se pudo quitar el registro.' }, { status: 500 });
  return NextResponse.json({ success: true, divulgacion: result.divulgacion });
}
