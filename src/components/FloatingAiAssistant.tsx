'use client';

import React, { useState } from 'react';
import { ProcessItem } from '../types';
import { Bot, X, ChevronLeft, Sparkles, FileText } from 'lucide-react';
import { ICON_MAP } from './ProcessList';
import { AiChatPanel } from './AiChatPanel';

interface FloatingAiAssistantProps {
  processes: ProcessItem[];
}

export const FloatingAiAssistant: React.FC<FloatingAiAssistantProps> = ({ processes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const selectedProcess = processes.find(p => p.slug === selectedSlug);

  const handleToggle = () => setIsOpen(prev => !prev);
  const handleClose = () => setIsOpen(false);
  const handleBackToPicker = () => setSelectedSlug(null);

  return (
    <>
      {/* Panel expandido */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
          {selectedProcess ? (
            <div className="relative">
              <div className="absolute -top-3 left-3 z-10 flex items-center gap-1.5">
                <button
                  onClick={handleBackToPicker}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition"
                  title="Elegir otro proceso"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Cambiar proceso
                </button>
              </div>
              <AiChatPanel
                processSlug={selectedProcess.slug}
                processName={selectedProcess.name}
                processCode={selectedProcess.code}
                processVersion={selectedProcess.activeVersion}
                heightClassName="h-[75vh] max-h-[560px]"
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[75vh] max-h-[560px]">
              {/* Header */}
              <div className="bg-[#003366] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white text-[#003366] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">Asistente IA de Calidad</h3>
                    <p className="text-[11px] text-emerald-300">Elige un proceso para empezar</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 text-slate-200 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selector de proceso */}
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/60">
                <div className="grid grid-cols-2 gap-2">
                  {processes.map((process) => (
                    <button
                      key={process.slug}
                      onClick={() => setSelectedSlug(process.slug)}
                      id={`floating-assistant-select-${process.slug}`}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left flex flex-col gap-2"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 w-fit">
                        {ICON_MAP[process.iconName] || <FileText className="w-5 h-5 text-slate-600" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 leading-tight">
                        {process.name}
                      </span>
                    </button>
                  ))}
                  {processes.length === 0 && (
                    <p className="col-span-2 text-xs text-slate-400 text-center py-6">Cargando procesos...</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={handleToggle}
        id="floating-ai-assistant-btn"
        className="fixed bottom-5 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-[#003366] hover:bg-[#002244] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300/50"
        title="Asistente IA de Calidad"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#003366] animate-pulse" />
          </div>
        )}
      </button>
    </>
  );
};
