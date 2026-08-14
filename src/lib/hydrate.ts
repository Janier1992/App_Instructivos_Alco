import { loadCustomRagDocumentsFromSupabase } from './customRagStore';
import { loadAutonomyAssignmentsFromSupabase } from './autonomyAssignmentsStore';
import { loadProcessVideosFromSupabase } from './processVideosStore';
import { loadCircularesFromSupabase } from './circularesStore';

/**
 * Hidrata los stores en memoria (documentos RAG, asignaciones de autonomía,
 * videos de proceso) desde Supabase antes de atender tráfico. En Next.js
 * cada route handler corre en el mismo proceso/módulo mientras la instancia
 * serverless esté "caliente", así que memoizar la promesa evita
 * re-consultar Supabase en cada request — solo se ejecuta una vez por cold
 * start.
 */
let hydrationPromise: Promise<void> | null = null;

export function ensureHydrated(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = Promise.all([
      loadCustomRagDocumentsFromSupabase(),
      loadAutonomyAssignmentsFromSupabase(),
      loadProcessVideosFromSupabase(),
      loadCircularesFromSupabase()
    ]).then(() => undefined);
  }
  return hydrationPromise;
}
