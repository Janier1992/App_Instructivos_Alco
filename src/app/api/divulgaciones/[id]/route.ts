import { NextRequest, NextResponse } from 'next/server';
import { getDivulgacion, updateDivulgacion, deleteDivulgacion, validateDivulgacionInput, DivulgacionInput } from '@/src/lib/divulgacionStore';

type Params = { params: Promise<{ id: string }> };

/** Una divulgación con todas sus filas de asistencia y firmas. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const divulgacion = await getDivulgacion(id);
    if (!divulgacion) return NextResponse.json({ error: 'No se encontró la divulgación.' }, { status: 404 });
    return NextResponse.json({ success: true, divulgacion }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar la divulgación.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body: DivulgacionInput = await request.json();
    const invalid = validateDivulgacionInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const result = await updateDivulgacion(id, body);
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo actualizar la divulgación.' }, { status: 500 });
    return NextResponse.json({ success: true, divulgacion: result.divulgacion });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const result = await deleteDivulgacion(id);
  if (!result.success) return NextResponse.json({ error: 'No se pudo eliminar la divulgación.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
