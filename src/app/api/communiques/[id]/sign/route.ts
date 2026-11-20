import { NextRequest, NextResponse } from 'next/server';
import { signCommunique, validateSignature } from '@/src/lib/communiqueStore';

/** Pública — registra o quita la firma de un firmante del comunicado: el firmante dibuja su firma en la app y queda en su casilla. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { index, firma } = await request.json();
    const invalid = validateSignature(firma ?? null);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const result = await signCommunique(id, Number(index), firma ?? null);
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo guardar la firma.' }, { status: 500 });
    return NextResponse.json({ success: true, communique: result.communique });
  } catch (err: any) {
    console.error('Error registrando firma del comunicado:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
