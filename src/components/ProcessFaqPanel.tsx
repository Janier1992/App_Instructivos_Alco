'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, RefreshCw, ShieldCheck } from 'lucide-react';

interface ProcessFaqPanelProps {
  processSlug: string;
}

interface FaqEntry {
  question: string;
  answer?: string;
  loading: boolean;
}

/**
 * Preguntas frecuentes reales del proceso — reutiliza las mismas preguntas
 * que ya alimentan los chips de sugerencia del chat (/api/chat/suggestions,
 * agrupadas por texto repetido en chatQueriesStore.ts), pero las muestra
 * como una lista visible en la Documentación del Proceso en vez de
 * quedar escondidas dentro del chat. Pensado para que el supervisor (o
 * cualquiera) encuentre la respuesta a una duda repetida con un toque, sin
 * tener que escribir la pregunta de nuevo — la respuesta sale del mismo
 * motor RAG grounded en el material de apoyo real del proceso.
 */
export const ProcessFaqPanel: React.FC<ProcessFaqPanelProps> = ({ processSlug }) => {
  const [entries, setEntries] = useState<FaqEntry[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/suggestions?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) {
        setEntries((data.suggestions || []).map((q: string) => ({ question: q, loading: false })));
      }
    } catch (err) {
      console.error('Error cargando preguntas frecuentes:', err);
      setEntries([]);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (idx: number) => {
    if (openIndex === idx) {
      setOpenIndex(null);
      return;
    }
    setOpenIndex(idx);

    const entry = entries?.[idx];
    if (!entry || entry.answer || entry.loading) return;

    setEntries(prev => (prev ? prev.map((e, i) => (i === idx ? { ...e, loading: true } : e)) : prev));
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processSlug, question: entry.question, history: [] })
      });
      const data = await res.json();
      setEntries(prev =>
        prev ? prev.map((e, i) => (i === idx ? { ...e, answer: data.reply || 'No se pudo obtener respuesta.', loading: false } : e)) : prev
      );
    } catch (err) {
      console.error('Error obteniendo respuesta de FAQ:', err);
      setEntries(prev => (prev ? prev.map((e, i) => (i === idx ? { ...e, answer: 'Error de conexión. Intenta de nuevo.', loading: false } : e)) : prev));
    }
  };

  if (!entries || entries.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-[#003366]" />
        <h3 className="font-bold text-slate-900 text-sm">Preguntas Frecuentes de este Proceso</h3>
      </div>
      <p className="text-xs text-slate-500">
        Las dudas que más se repiten, con la respuesta basada en la documentación oficial — toca una para verla, sin tener que escribirla de nuevo en el chat.
      </p>

      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={idx} className="rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => handleToggle(idx)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-slate-50 transition"
            >
              <span className="text-xs font-semibold text-slate-800">{entry.question}</span>
              {openIndex === idx ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>
            {openIndex === idx && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/60">
                {entry.loading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Buscando en la documentación...
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-700 whitespace-pre-line">{entry.answer}</p>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-700 mt-2">
                      <ShieldCheck className="w-3 h-3" />
                      Basado en la documentación oficial vigente
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
