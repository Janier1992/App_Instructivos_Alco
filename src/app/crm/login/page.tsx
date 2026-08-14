import { Suspense } from 'react';
import { CrmLoginForm } from '@/src/components/crm/CrmLoginForm';

export default function CrmLoginPage() {
  return (
    <div className="min-h-screen bg-[#002244] flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <CrmLoginForm />
      </Suspense>
    </div>
  );
}
