import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/src/lib/adminAuth';
import { CrmShell } from '@/src/components/crm/CrmShell';

export default async function CrmAppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Defensa en profundidad: middleware.ts ya bloquea esto, pero el layout
  // necesita la sesión igualmente para saber qué mostrar (nombre, rol).
  if (!session) {
    redirect('/crm/login');
  }

  return <CrmShell user={session}>{children}</CrmShell>;
}
