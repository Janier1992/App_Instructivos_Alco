import { Suspense } from 'react';
import { InstructivosView } from '@/src/components/InstructivosView';

export default function InstructivosPage() {
  // useSearchParams (lee ?proceso=slug) exige un límite de Suspense.
  return (
    <Suspense fallback={null}>
      <InstructivosView />
    </Suspense>
  );
}
