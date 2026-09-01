import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { getShiftChecks } from '@/src/lib/shiftChecksStore';

// Historial de autocontroles registrados — todos los procesos o uno solo,
// más recientes primero. Le sirve a Calidad para verificar que el
// autocontrol se esté usando de verdad, y para ver rápido cuáles marcaron
// algún ítem como no conforme (allPassed = false).
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const checks = await getShiftChecks(processSlug, 100);
  return NextResponse.json({ success: true, checks });
}
