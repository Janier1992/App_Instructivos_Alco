import { NextRequest, NextResponse } from 'next/server';
import { getMetrologyReplacementById } from '@/src/lib/metrologyReplacementsStore';

/** Pública — detalle de un registro de reposición/baja (incluye firmas), para ver o exportar a PDF. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const replacement = await getMetrologyReplacementById(id);
  if (!replacement) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, replacement });
}
