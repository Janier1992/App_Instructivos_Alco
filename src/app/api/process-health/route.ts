import { NextRequest, NextResponse } from 'next/server';
import { getProcessHealthStats } from '@/src/lib/chatQueriesStore';

// Pública — semáforo de salud de cada proceso (🟢🟡🔴): qué tan seguido
// resuelve solo vs. escala a Calidad, en los últimos 30 días. Sin
// processSlug devuelve todos los procesos (para el tablero del dashboard).
export async function GET(request: NextRequest) {
  const processSlug = request.nextUrl.searchParams.get('processSlug') || undefined;
  const stats = await getProcessHealthStats(processSlug);
  return NextResponse.json({ success: true, stats });
}
