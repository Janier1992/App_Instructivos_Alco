export type CalibrationStatus = 'Vigente' | 'Vencido' | 'Próximo' | 'Mantenimiento';

/** Días hasta el vencimiento del certificado (negativo si ya venció). Sin fecha, se asume muy lejano. */
export function getDaysUntilDue(dueDate: string | null): number {
  if (!dueDate) return 999;
  const today = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
}

/** El estado guardado manda salvo que la vigencia calculada por fecha ya lo haya superado (vencido/próximo a 30 días). */
export function getStatusConfig(status: string, daysLeft: number): StatusConfig {
  if (status === 'Vencido' || daysLeft < 0) return { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500', label: 'VENCIDO' };
  if (status === 'Mantenimiento') return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500', label: 'MANTENIMIENTO' };
  if (status === 'Próximo' || daysLeft <= 30) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500', label: 'PRÓXIMO' };
  return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'VIGENTE' };
}
