import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { deleteCustomRagDocument } from '@/src/lib/customRagStore';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureHydrated();
  const { id } = await params;
  const deleted = await deleteCustomRagDocument(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Documento PDF no encontrado en el store RAG.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Documento PDF eliminado del motor RAG.' });
}
