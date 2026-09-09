'use client';

import React from 'react';
import { X, FileText, Pencil, Trash2 } from 'lucide-react';
import { MetrologyReplacement } from '@/src/lib/metrologyReplacementsStore';
import { exportMetrologyReplacementToPDF } from '@/src/lib/metrologyReplacementPdfExport';

interface Props {
  replacement: MetrologyReplacement;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** Detalle de un registro de Reposición y Baja — reutilizado por la vista pública y por el CRM. */
export const MetrologyReplacementViewModal: React.FC<Props> = ({ replacement, onClose, onEdit, onDelete }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900">Reposición / baja — {replacement.nombreEquipo}</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <InfoBox label="Fecha" value={replacement.fechaRegistro} />
        <InfoBox label="Área de uso" value={replacement.areaUso} />
        <InfoBox label="Devuelve anterior" value={replacement.devuelveEquipoAnterior} />
      </div>

      <div className="bg-amber-50 rounded-xl p-3 space-y-1">
        <p className="text-[10px] font-bold text-amber-700 uppercase">Equipo dado de baja</p>
        <p className="text-xs font-bold">{replacement.nombreEquipo} — {replacement.codigo}</p>
        {replacement.marca && <p className="text-[11px] text-slate-600">{replacement.marca}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Motivo de reposición</p>
          <p>{replacement.motivoReposicion || '—'}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción de la baja</p>
          <p>{replacement.descripcionBaja || '—'}</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[10px] font-bold text-[#003366] uppercase">Resp. proceso/área</p>
          <p className="font-semibold">{replacement.nombreResponsable}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#003366] uppercase">Resp. Calidad</p>
          <p className="font-semibold">{replacement.nombreResponsableCalidad || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#003366] uppercase">¿Se cobra equipo?</p>
          <p className="font-semibold">{replacement.seCobraEquipo || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SignaturePreview label="Firma responsable área" src={replacement.firmaResponsableArea} />
        <SignaturePreview label="Firma responsable Calidad" src={replacement.firmaResponsableCalidad} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => exportMetrologyReplacementToPDF(replacement)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
          <FileText className="w-3.5 h-3.5" /> Exportar PDF
        </button>
        {onEdit && (
          <button onClick={onEdit} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        )}
      </div>
    </div>
  </div>
);

const InfoBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
    <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
    <p className="font-semibold">{value || '—'}</p>
  </div>
);

const SignaturePreview: React.FC<{ label: string; src: string | null }> = ({ label, src }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
    <div className="h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="text-[11px] text-slate-300">Sin firma</span>
      )}
    </div>
  </div>
);
