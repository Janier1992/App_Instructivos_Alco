import type { FieldInspectionFormValues } from '@/src/components/crm/FieldInspectionForm';

export interface OfflineQueueItem {
  id: string;
  payload: FieldInspectionFormValues;
}

/**
 * Cola offline localStorage para el registro de inspecciones — compartida
 * entre el módulo público de Control Calidad y el CRM, cada uno con su
 * propia clave para no mezclar registros creados desde uno u otro.
 */
export function loadFieldInspectionQueue(storageKey: string): OfflineQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
}

export function saveFieldInspectionQueue(storageKey: string, queue: OfflineQueueItem[]) {
  localStorage.setItem(storageKey, JSON.stringify(queue));
}
