import { NextRequest, NextResponse } from 'next/server';
import { getLatestShiftCheck } from '@/src/lib/shiftChecksStore';

// Pública — último autocontrol registrado para un proceso, para mostrar
// "ya se auditó hoy" o "todavía sin autocontrol" en la vista pública.
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
  }

  const check = await getLatestShiftCheck(processSlug);
  return NextResponse.json({ success: true, check });
}
