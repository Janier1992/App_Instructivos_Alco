import { PROCESSES, DOCUMENTS } from '@/src/data/processesData';
import { ProcessList } from '@/src/components/ProcessList';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getCustomRagDocuments } from '@/src/lib/customRagStore';

// Sin esto, Next.js pre-renderiza esta página una sola vez en build time y
// sirve esa foto fija a todos los usuarios — el conteo de documentos se
// quedaría congelado en el número que había al momento del build, sin
// reflejar los PDFs que se suban después.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await ensureHydrated();

  // Conteo real de documentos por proceso (estáticos + PDFs cargados al RAG,
  // incluidos los de alcance "general") — misma cuenta que ya se muestra en
  // el detalle de cada proceso, para que la lista principal no muestre un
  // número distinto al que el usuario ve al entrar.
  const documentCounts: Record<string, number> = {};
  for (const process of PROCESSES) {
    const staticCount = DOCUMENTS[process.slug]?.length || 0;
    const ragCount = getCustomRagDocuments(process.slug).length;
    documentCounts[process.slug] = staticCount + ragCount;
  }

  return <ProcessList processes={PROCESSES} documentCounts={documentCounts} />;
}
