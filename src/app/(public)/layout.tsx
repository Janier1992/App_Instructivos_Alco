import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/src/components/AppShell';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Control de Calidad Alco S.A.S.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%23003366'/%3E%3Cpath d='M7 12.5l3 3 7-7' stroke='%23ffffff' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
  }
};

export default function PublicRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
