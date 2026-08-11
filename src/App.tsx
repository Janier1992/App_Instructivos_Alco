/**
 * Aplicativo de Control de Procesos de Calidad Alco S.A.S.
 */

import React, { useState, useEffect } from 'react';
import { ProcessItem } from './types';
import { Header, ActiveTab } from './components/Header';
import { ProcessList } from './components/ProcessList';
import { ProcessDetail } from './components/ProcessDetail';
import { QRScannerModal } from './components/QRScannerModal';
import { QRGeneratorModal } from './components/QRGeneratorModal';
import { GoldenEvaluatorModal } from './components/GoldenEvaluatorModal';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { WhatsAppConversations } from './components/WhatsAppConversations';
import { AgentConfigView } from './components/AgentConfigView';

export default function App() {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [currentProcessSlug, setCurrentProcessSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('whatsapp-sim');

  // Modales
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isEvaluatorOpen, setIsEvaluatorOpen] = useState(false);
  const [qrModalProcess, setQrModalProcess] = useState<ProcessItem | null>(null);

  // Cargar lista de procesos al iniciar
  useEffect(() => {
    fetch('/api/processes')
      .then((res) => res.json())
      .then((data) => {
        if (data.processes) {
          setProcesses(data.processes);
        }
      })
      .catch((err) => console.error('Error cargando procesos:', err));

    // Detección de ruta inicial por Hash o Path
    const checkRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash.startsWith('#/procesos/')) {
        const slug = hash.replace('#/procesos/', '');
        setCurrentProcessSlug(slug);
        setActiveTab('procesos');
      } else if (path.startsWith('/procesos/')) {
        const slug = path.replace('/procesos/', '');
        setCurrentProcessSlug(slug);
        setActiveTab('procesos');
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  const handleSelectProcess = (slug: string) => {
    setCurrentProcessSlug(slug);
    setActiveTab('procesos');
    window.location.hash = `#/procesos/${slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setCurrentProcessSlug(null);
    setActiveTab('whatsapp-sim');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeProcessItem = processes.find((p) => p.slug === currentProcessSlug);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Header Principal */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'procesos') {
            setCurrentProcessSlug(null);
            window.location.hash = '';
          }
        }}
        onGoHome={handleGoHome}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenEvaluator={() => setIsEvaluatorOpen(true)}
        currentProcessName={activeProcessItem?.name}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'whatsapp-sim' && (
          <WhatsAppSimulator
            processes={processes}
            selectedProcessSlug={currentProcessSlug}
            onSelectProcessSlug={(slug) => setCurrentProcessSlug(slug)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'procesos' && (
          currentProcessSlug ? (
            <ProcessDetail
              slug={currentProcessSlug}
              onBack={() => {
                setCurrentProcessSlug(null);
                window.location.hash = '';
              }}
              onOpenQRModal={(proc) => setQrModalProcess(proc)}
            />
          ) : (
            <ProcessList
              processes={processes}
              onSelectProcess={handleSelectProcess}
              onOpenQRModal={(proc) => setQrModalProcess(proc)}
            />
          )
        )}

        {activeTab === 'conversaciones' && (
          <WhatsAppConversations />
        )}

        {activeTab === 'configuracion' && (
          <AgentConfigView />
        )}
      </main>

      {/* Footer de Créditos y Versión Alco */}
      <footer className="bg-[#002244] text-slate-300 py-6 border-t border-[#001830] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-slate-100">
              Alco Windows & Doors S.A.S. — Plataforma WhatsApp & Calidad Cloud
            </span>
          </div>
          <p className="text-slate-400">
            Estándares Vigentes • Webhook Meta Graph API v25.0 • Agente IA RAG
          </p>
        </div>
      </footer>

      {/* Modales Interactivos */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        processes={processes}
        onSelectProcess={(slug) => {
          handleSelectProcess(slug);
          setActiveTab('whatsapp-sim');
        }}
      />

      <QRGeneratorModal
        isOpen={!!qrModalProcess}
        onClose={() => setQrModalProcess(null)}
        process={qrModalProcess}
      />

      <GoldenEvaluatorModal
        isOpen={isEvaluatorOpen}
        onClose={() => setIsEvaluatorOpen(false)}
      />
    </div>
  );
}

