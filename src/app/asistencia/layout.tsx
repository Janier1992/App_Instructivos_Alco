import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';

/**
 * Raíz de layout independiente para /asistencia: la página pública de registro de asistencia a una divulgación.
 * A propósito NO envuelve con <AppShell> (menú, módulos y asistente de la aplicación): quien abre el enlace solo ve
 * el formulario de registro. Tampoco se indexa en buscadores.
 */
export const metadata: Metadata = {
  title: 'Registro de asistencia — Alco S.A.S.',
  robots: { index: false, follow: false },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%23003366'/%3E%3Cpath d='M7 12.5l3 3 7-7' stroke='%23ffffff' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
  }
};

export const viewport: Viewport = { themeColor: '#003366', width: 'device-width', initialScale: 1 };

export default function AttendanceRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
