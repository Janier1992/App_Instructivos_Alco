import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getFieldInspectionsDashboardStats } from '@/src/lib/fieldInspectionsStore';

/**
 * Pública — métricas agregadas del Dashboard Operativo, calculadas en el
 * servidor sobre TODA la tabla (ver field_inspections_dashboard_stats en
 * db/migrate_field_inspections_dashboard_stats.sql), no sobre un recorte de
 * filas traídas al navegador.
 */
export async function GET(request: NextRequest) {
  await ensureHydrated();

  const daysParam = request.nextUrl.searchParams.get('days');
  const days = Math.max(1, Math.min(365, Number(daysParam) || 30));

  const stats = await getFieldInspectionsDashboardStats(days);
  if (!stats) {
    return NextResponse.json({ error: 'No se pudieron calcular las métricas del dashboard.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, stats });
}
