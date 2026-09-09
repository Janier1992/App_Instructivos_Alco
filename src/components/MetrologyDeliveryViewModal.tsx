'use client';

import React from 'react';
import { X, FileText, Pencil, Trash2 } from 'lucide-react';
import { MetrologyDelivery } from '@/src/lib/metrologyDeliveriesStore';
import { exportMetrologyDeliveryToPDF } from '@/src/lib/metrologyPdfExport';

interface Props {
  delivery: MetrologyDelivery;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** Detalle de un acta de entrega de Metrología Pro — reutilizado por la vista pública y por el CRM. */
export const MetrologyDeliveryViewModal: React.FC<Props> = ({ delivery, onClose, onEdit, onDelete }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900">Acta de entrega — {delivery.receptorNombre}</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <InfoBox label="Fecha" value={delivery.fecha} />
        <InfoBox label="Área" value={delivery.area} />
        <InfoBox label="Sede" value={delivery.sede} />
      </div>

      <div className="bg-blue-50 rounded-xl p-3 space-y-1">
        <p className="text-[10px] font-bold text-[#003366] uppercase">Receptor</p>
        <p className="text-xs font-bold">{delivery.receptorNombre} — {delivery.receptorCedula}</p>
        {delivery.receptorCargo && <p className="text-[11px] text-slate-600">{delivery.receptorCargo}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase">Equipos entregados</p>
        {delivery.items.map((item, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
            <p className="font-bold">{item.cantidad}x {item.equipoNombre} {item.codigo ? `(${item.codigo})` : ''} {item.longitud ? `[${item.longitud}]` : ''}</p>
            <p className="text-[11px] text-slate-500">{item.marca} — {item.observaciones}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SignaturePreview label="Firma quien entrega" src={delivery.firmaEntrega} />
        <SignaturePreview label="Firma quien recibe" src={delivery.firmaRecibe} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => exportMetrologyDeliveryToPDF(delivery)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
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
