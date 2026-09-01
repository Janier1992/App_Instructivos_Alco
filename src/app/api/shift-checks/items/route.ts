import { NextRequest, NextResponse } from 'next/server';
import { getShiftCheckItems } from '@/src/lib/shiftChecksStore';

// Pública — ítems activos del checklist de autocontrol de un proceso,
// definidos por Calidad desde el CRM. Si el proceso no tiene ítems
// configurados, devuelve un arreglo vacío (la app pública simplemente no
// muestra la sección de autocontrol para ese proceso).
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const items = await getShiftCheckItems(processSlug, true);
  return NextResponse.json({ success: true, items });
}
