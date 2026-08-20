import { PROCESSES } from '@/src/data/processesData';
import { ProcessList } from '@/src/components/ProcessList';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getCustomRagDocuments, loadCustomRagDocumentsFromSupabase } from '@/src/lib/customRagStore';

// Sin esto, Next.js pre-renderiza esta página una sola vez en build time y
// sirve esa foto fija a todos los usuarios — el conteo de documentos se
// quedaría congelado en el número que había al momento del build, sin
// reflejar los PDFs que se suban después.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await ensureHydrated();
  // Recarga puntual desde Supabase (no solo lo que esta instancia hidrató en
  // su cold start) para que el conteo refleje subidas recientes hechas desde
  // otra instancia serverless.
  await loadCustomRagDocumentsFromSupabase();

  // Conteo real de documentos por proceso: solo los PDFs efectivamente
  // cargados al motor RAG (los únicos administrables y visibles hoy). Los
  // documentos estáticos de processesData.ts no se suman — esa sección está
  // oculta de la vista (ver SHOW_NORMATIVE_DOCS_SECTION en ProcessDetail.tsx)
  // y sumarlos infla el conteo con documentos que el usuario no ve.
  const documentCounts: Record<string, number> = {};
  for (const process of PROCESSES) {
    documentCounts[process.slug] = getCustomRagDocuments(process.slug).length;
  }

  return <ProcessList processes={PROCESSES} documentCounts={documentCounts} />;
}
