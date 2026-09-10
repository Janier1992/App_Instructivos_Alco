/** Paleta compartida para los gráficos del Dashboard operativo — consistente entre Inspecciones en Campo y Metrología Pro. */
export const CHART_PALETTE = ['#003366', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export const ESTADO_COLORS: Record<string, string> = {
  Aprobado: '#10b981',
  'Aprobado (Condicionado)': '#f59e0b',
  Rechazado: '#ef4444',
  Pendiente: '#94a3b8',
  Reprocesar: '#f97316',
  NA: '#cbd5e1'
};

export const CALIBRATION_STATUS_COLORS: Record<string, string> = {
  VIGENTE: '#10b981',
  PRÓXIMO: '#f59e0b',
  VENCIDO: '#ef4444',
  MANTENIMIENTO: '#8b5cf6'
};

export function colorForIndex(i: number): string {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}
