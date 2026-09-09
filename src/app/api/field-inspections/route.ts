import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getFieldInspections } from '@/src/lib/fieldInspectionsStore';

/** Pública, solo lectura — consulta de las inspecciones de campo registradas. */
export async function GET(request: NextRequest) {
  await ensureHydrated();

  const estado = request.nextUrl.searchParams.get('estado') || undefined;
  const areaProceso = request.nextUrl.searchParams.get('areaProceso') || undefined;
  const inspections = await getFieldInspections({ estado, areaProceso, limit: 200 });
  return NextResponse.json({ success: true, inspections });
}
