'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ExternalLink, RefreshCw, FileQuestion, ArrowLeft, Table2, FileEdit } from 'lucide-react';

interface InspectionForm {
  id: string;
  title: string;
  embedUrl: string;
  recordsEmbedUrl?: string;
}

interface ProcessInspectionFormsPanelProps {
  processSlug: string;
}

/**
 * Formularios de inspección (Microsoft Forms u otra plataforma con opción
 * de "insertar código") abiertos directamente dentro del aplicativo, sin
 * ventana ni pestaña aparte. El enlace de embed lo carga Calidad desde el
 * CRM; aquí solo se listan y se muestran en un iframe al seleccionarlos.
 */
export const ProcessInspectionFormsPanel: React.FC<ProcessInspectionFormsPanelProps> = ({ processSlug }) => {
  const [forms, setForms] = useState<InspectionForm[] | null>(null);
  const [activeForm, setActiveForm] = useState<InspectionForm | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'records'>('form');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/inspection-forms?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setForms(data.forms || []);
    } catch (err) {
      console.error('Error cargando formularios de inspección:', err);
      setForms([]);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  if (forms === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando formularios...</span>
      </div>
    );
  }

  if (activeForm) {
    const showingRecords = viewMode === 'records' && !!activeForm.recordsEmbedUrl;
    const currentUrl = showingRecords ? activeForm.recordsEmbedUrl! : activeForm.embedUrl;

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActiveForm(null); setViewMode('form'); }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#003366] transition shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <span className="text-sm font-bold text-slate-800 truncate">{activeForm.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {activeForm.recordsEmbedUrl && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-full p-0.5">
                <button
                  onClick={() => setViewMode('form')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full transition ${
                    viewMode === 'form' ? 'bg-white text-[#003366] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileEdit className="w-3 h-3" /> Formulario
                </button>
                <button
                  onClick={() => setViewMode('records')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full transition ${
                    viewMode === 'records' ? 'bg-white text-[#003366] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Table2 className="w-3 h-3" /> Ver Registros
                </button>
              </div>
            )}
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#003366] hover:underline shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en pestaña nueva
            </a>
          </div>
        </div>
        <iframe
          key={`${activeForm.id}-${showingRecords ? 'records' : 'form'}`}
          src={currentUrl}
          title={showingRecords ? `Registros de ${activeForm.title}` : activeForm.title}
          className="w-full h-[70vh] border-0"
          allowFullScreen
        />
        {/* Algunas plataformas bloquean el embebido a nivel de administrador
            y el iframe queda en blanco sin ningún error detectable — el
            enlace de arriba es el respaldo confiable en cualquier caso. Los
            registros nunca se guardan en esta app: solo se embebe la vista
            que ya vive en Excel Online/SharePoint. */}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-[#003366]" />
        <h3 className="font-bold text-slate-900 text-sm">Formularios de Inspección</h3>
      </div>

      {forms.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <FileQuestion className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Todavía no hay formularios de inspección cargados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {forms.map(form => (
            <button
              key={form.id}
              onClick={() => { setActiveForm(form); setViewMode('form'); }}
              className="text-left p-4 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-300 transition flex items-center gap-3"
            >
              <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                <ClipboardList className="w-4 h-4 text-[#003366]" />
              </div>
              <span className="text-sm font-bold text-slate-800 line-clamp-2">{form.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
