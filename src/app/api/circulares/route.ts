import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getPublishedCirculares } from '@/src/lib/circularesStore';

// Pública, solo lectura: únicamente circulares con status = 'published'.
// Crear/editar/publicar circulares se hace desde /api/crm/circulares.
export async function GET(request: NextRequest) {
  await ensureHydrated();
  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const circulares = getPublishedCirculares(processSlug);
  return NextResponse.json({ success: true, circulares, total: circulares.length });
}
