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
