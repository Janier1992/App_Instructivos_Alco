import { Suspense } from 'react';
import { CrmResetPasswordForm } from '@/src/components/crm/CrmResetPasswordForm';

export default function CrmResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#002244] flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <CrmResetPasswordForm />
      </Suspense>
    </div>
  );
}
