import { NextRequest, NextResponse } from 'next/server';
import { updateCommunique, deleteCommunique, validateCommuniqueInput, CommuniqueInput } from '@/src/lib/communiqueStore';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: CommuniqueInput = await request.json();

  const validationError = validateCommuniqueInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const result = await updateCommunique(id, body);
  if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo actualizar el comunicado.' }, { status: 500 });
  return NextResponse.json({ success: true, communique: result.communique });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteCommunique(id);
  if (!result.success) return NextResponse.json({ error: 'No se pudo eliminar el comunicado.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
