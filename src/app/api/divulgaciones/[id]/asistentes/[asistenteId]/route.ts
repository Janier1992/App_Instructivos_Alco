import { NextRequest, NextResponse } from 'next/server';
import { deleteAsistente, updateAsistente } from '@/src/lib/divulgacionStore';

/** Quita una fila de asistencia (por ejemplo, un registro con datos equivocados). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; asistenteId: string }> }) {
  const { id, asistenteId } = await params;
  const result = await deleteAsistente(id, asistenteId);
  if (!result.success) return NextResponse.json({ error: 'No se pudo quitar el registro.' }, { status: 500 });
  return NextResponse.json({ success: true, divulgacion: result.divulgacion });
}

/** Corrige el nombre, la cédula o el proceso o sección de una fila de asistencia; la firma no cambia. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; asistenteId: string }> }) {
  const { id, asistenteId } = await params;
  try {
    const body = await request.json();
    const nombre = String(body.nombre || '').trim();
    const cedula = String(body.cedula || '').replace(/\D/g, '');
    if (!nombre || !cedula) return NextResponse.json({ error: 'Se requiere el nombre y la cédula.' }, { status: 400 });
    const result = await updateAsistente(id, asistenteId, { nombre, cedula, procesoSeccion: String(body.procesoSeccion || '') });
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo actualizar el registro.' }, { status: result.error?.includes('cédula') ? 409 : 500 });
    return NextResponse.json({ success: true, divulgacion: result.divulgacion });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
