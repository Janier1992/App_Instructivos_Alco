/** Paleta compartida para los gráficos del Dashboard operativo — consistente entre Inspecciones en Campo y Metrología Pro. */
export const CHART_PALETTE = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];

export const ESTADO_COLORS: Record<string, string> = {
  Aprobado: '#059669',
  'Aprobado (Condicionado)': '#d97706',
  Rechazado: '#dc2626',
  Pendiente: '#94a3b8',
  Reprocesar: '#ea580c',
  NA: '#cbd5e1'
};

export const CALIBRATION_STATUS_COLORS: Record<string, string> = {
  VIGENTE: '#059669',
  PRÓXIMO: '#d97706',
  VENCIDO: '#dc2626',
  MANTENIMIENTO: '#7c3aed'
};

export function colorForIndex(i: number): string {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}

/** Media móvil simple — suaviza el ruido diario para que la tendencia real sea legible. */
export function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}
