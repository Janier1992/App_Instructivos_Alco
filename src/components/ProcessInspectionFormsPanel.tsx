'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ExternalLink, RefreshCw, FileQuestion, ArrowLeft, Table2 } from 'lucide-react';

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
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveForm(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#003366] transition shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <span className="text-sm font-bold text-slate-800 truncate">{activeForm.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* SharePoint/Excel Online no se puede embeber en un sitio externo — Microsoft
                lo bloquea a nivel de plataforma (frame-ancestors), sin excepción posible
                desde nuestro lado — así que la Vista de Registros siempre abre en pestaña
                nueva en vez de intentar un iframe que fallaría siempre. */}
            {activeForm.recordsEmbedUrl && (
              <a
                href={activeForm.recordsEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition shrink-0"
              >
                <Table2 className="w-3.5 h-3.5" />
                Ver Registros (pestaña nueva)
              </a>
            )}
            <a
              href={activeForm.embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#003366] hover:underline shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir formulario en pestaña nueva
            </a>
          </div>
        </div>
        <iframe
          key={activeForm.id}
          src={activeForm.embedUrl}
          title={activeForm.title}
          className="w-full h-[70vh] border-0"
          allowFullScreen
        />
        {/* Algunas plataformas bloquean el embebido a nivel de administrador
            y el iframe queda en blanco sin ningún error detectable — el
            enlace de arriba es el respaldo confiable en cualquier caso. Los
            registros nunca se guardan en esta app: el enlace de "Ver
            Registros" solo referencia la vista que ya vive en Excel
            Online/SharePoint. */}
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
              onClick={() => setActiveForm(form)}
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
