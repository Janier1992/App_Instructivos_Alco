'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ProcessItem } from '@/src/types';
import { Header } from './Header';
import { FloatingAiAssistant } from './FloatingAiAssistant';
import { OfflineBanner } from './OfflineBanner';

/**
 * Envoltorio cliente global: header, pie de página y el asistente flotante,
 * visibles en todas las rutas. Vive fuera de `layout.tsx` (que es un Server
 * Component) porque necesita estado de React y hooks de navegación.
 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/processes')
      .then(res => res.json())
      .then(data => {
        if (data.processes) setProcesses(data.processes);
      })
      .catch(err => console.error('Error cargando procesos:', err));
  }, []);

  const slugMatch = pathname?.match(/^\/procesos\/([^/]+)/);
  const currentProcess = slugMatch ? processes.find(p => p.slug === slugMatch[1]) : undefined;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      <Header currentProcessName={currentProcess?.name} />
      <OfflineBanner />

      <main className="flex-1 pb-12">{children}</main>

      <footer className="bg-[#002244] text-slate-300 py-6 border-t border-[#001830] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-slate-100">
              Alco Windows & Doors S.A.S. — Plataforma de Calidad Cloud
            </span>
          </div>
          <p className="text-slate-400">
            Estándares Vigentes • Asistente IA RAG por Proceso
          </p>
        </div>
      </footer>

      <FloatingAiAssistant processes={processes} />
    </div>
  );
};
