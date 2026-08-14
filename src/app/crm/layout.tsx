import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';

/**
 * Raíz de layout independiente para /crm — a propósito NO envuelve con
 * <AppShell> (header/footer/asistente flotante públicos). El portal de
 * administración tiene su propio shell (CrmShell, en el layout protegido de
 * (app)/) y la página de login tiene su propio diseño de pantalla completa.
 * Ver la documentación de Next.js sobre "multiple root layouts": al no
 * existir ya un layout.tsx a nivel de src/app/, cada grupo de rutas de nivel
 * superior — (public) y crm — define su propio <html>/<body>.
 */
export const metadata: Metadata = {
  title: 'Portal de Administración — Alco S.A.S.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%23003366'/%3E%3Cpath d='M7 12.5l3 3 7-7' stroke='%23ffffff' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
  }
};

export default function CrmRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
