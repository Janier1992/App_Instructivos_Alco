import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireSession } from '@/src/lib/adminAuth';
import { ensureHydrated } from '@/src/lib/hydrate';
import { PROCESSES } from '@/src/data/processesData';
import { getProcessHealthStats, getTopEscalatedQuestions, HEALTH_MIN_SAMPLE } from '@/src/lib/chatQueriesStore';

export interface BottleneckRow {
  processSlug: string;
  processName: string;
  total: number;
  escalated: number;
  resolvedPct: number | null;
  topEscalatedQuestions: { question: string; count: number }[];
}

// Panel de "dónde sigue Calidad siendo cuello de botella": rankea los
// procesos por qué tan seguido escalan (últimos 30 días) y, para cada uno,
// las preguntas que más se repitieron entre las que sí escalaron — la señal
// más directa de qué criterio documentar primero. Ver getProcessHealthStats
// y getTopEscalatedQuestions en chatQueriesStore.ts.
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  await ensureHydrated();

  const healthStats = await getProcessHealthStats();
  const healthBySlug = new Map(healthStats.map(h => [h.processSlug, h]));

  const rows: BottleneckRow[] = await Promise.all(
    PROCESSES.map(async process => {
      const health = healthBySlug.get(process.slug);
      const topEscalatedQuestions = await getTopEscalatedQuestions(process.slug, 5);
      return {
        processSlug: process.slug,
        processName: process.name,
        total: health?.total || 0,
        escalated: health?.escalated || 0,
        resolvedPct: health?.resolvedPct ?? null,
        topEscalatedQuestions
      };
    })
  );

  // Peor primero: procesos con muestra suficiente y peor % resuelto arriba;
  // los que aún no tienen muestra suficiente (HEALTH_MIN_SAMPLE) quedan al
  // final, ordenados por volumen de escalamiento como señal secundaria.
  rows.sort((a, b) => {
    if (a.resolvedPct !== null && b.resolvedPct !== null) return a.resolvedPct - b.resolvedPct;
    if (a.resolvedPct === null && b.resolvedPct !== null) return 1;
    if (a.resolvedPct !== null && b.resolvedPct === null) return -1;
    return b.escalated - a.escalated;
  });

  return NextResponse.json({ success: true, rows, minSample: HEALTH_MIN_SAMPLE });
}
