import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getMatrixSheets } from '@/src/lib/matrixSheetsStore';

/** Pública — lista solo fichas publicadas, para el selector en planta. */
export async function GET(request: NextRequest) {
  await ensureHydrated();

  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const sheets = await getMatrixSheets(processSlug, true);
  return NextResponse.json({ success: true, sheets });
}
