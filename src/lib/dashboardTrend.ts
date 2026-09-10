import { movingAverage } from './dashboardColors';

/**
 * Construye una serie continua de los últimos `days` días (sin huecos,
 * incluso si un día no tuvo registros) a partir de una fecha 'YYYY-MM-DD'
 * por registro — usada por todos los gráficos de tendencia del Dashboard.
 */
export function buildDailyTrend<T>(
  items: T[],
  getDate: (item: T) => string | null,
  series: { key: string; predicate?: (item: T) => boolean }[],
  days = 30
): Array<Record<string, number | string>> {
  const today = new Date();
  const buckets = new Map<string, Record<string, number | string>>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    const row: Record<string, number | string> = { date: label, iso };
    for (const s of series) row[s.key] = 0;
    buckets.set(iso, row);
  }

  for (const item of items) {
    const fecha = getDate(item);
    if (!fecha) continue;
    const row = buckets.get(fecha);
    if (!row) continue;
    for (const s of series) {
      if (!s.predicate || s.predicate(item)) {
        row[s.key] = (row[s.key] as number) + 1;
      }
    }
  }

  return Array.from(buckets.values());
}

/** Agrega una serie de media móvil (`${sourceKey}Avg`) a una tendencia ya construida — para mostrar la tendencia real sin el ruido diario. */
export function withMovingAverage(
  trend: Array<Record<string, number | string>>,
  sourceKey: string,
  window = 7
): Array<Record<string, number | string>> {
  const values = trend.map(row => Number(row[sourceKey]) || 0);
  const avg = movingAverage(values, window);
  return trend.map((row, i) => ({ ...row, [`${sourceKey}Avg`]: Math.round(avg[i] * 10) / 10 }));
}

export function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = (getKey(item) || 'Sin dato').trim() || 'Sin dato';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export interface PeriodComparison {
  current: number;
  previous: number;
  /** null cuando el periodo previo no tiene datos para comparar (evita un % engañoso). */
  deltaPct: number | null;
}

/** Compara los últimos `days` días contra los `days` inmediatamente anteriores — para las flechas de tendencia de los KPI. */
export function compareToPreviousPeriod<T>(items: T[], getDate: (item: T) => string | null, days: number): PeriodComparison {
  const today = new Date();
  const cutoffCurrent = new Date(today);
  cutoffCurrent.setDate(cutoffCurrent.getDate() - days);
  const cutoffPrevious = new Date(today);
  cutoffPrevious.setDate(cutoffPrevious.getDate() - days * 2);

  let current = 0;
  let previous = 0;
  for (const item of items) {
    const fecha = getDate(item);
    if (!fecha) continue;
    const d = new Date(fecha);
    if (d >= cutoffCurrent) current++;
    else if (d >= cutoffPrevious) previous++;
  }

  const deltaPct = previous === 0 ? null : ((current - previous) / previous) * 100;
  return { current, previous, deltaPct };
}
