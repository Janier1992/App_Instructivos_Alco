'use client';

import React from 'react';
import { X, FileText, FileType2, Pencil, Trash2 } from 'lucide-react';
import type { SupplierClaim } from '@/src/lib/supplierClaimsStore';
import { exportSupplierClaimToPDF } from '@/src/lib/supplierClaimPdfExport';
import { exportSupplierClaimToWord } from '@/src/lib/supplierClaimWordExport';

interface Props {
  claim: SupplierClaim;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const photoUrl = (path: string) => `/api/supplier-claims/photo?path=${encodeURIComponent(path)}`;

/** Detalle de un informe de reclamo a proveedor, con las acciones Editar, Eliminar y exportar a Word o PDF. */
export const SupplierClaimViewModal: React.FC<Props> = ({ claim, onClose, onEdit, onDelete }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900">Informe NC — {claim.proveedor}</h3>
        <button onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <InfoBox label="Fecha" value={claim.fechaInforme} />
        <InfoBox label="Referencia" value={claim.referencias} />
        <InfoBox label="Lote" value={claim.lotes || '—'} />
        <InfoBox label="Material" value={claim.materiaPrima} />
      </div>

      <Section title={`Defecto: ${claim.defectoTitulo || 'Novedad en recepción'}`}>
        <p className="whitespace-pre-line">{claim.descripcionNc || claim.observacionInspector}</p>
      </Section>

      {claim.observacionesTecnicas.length > 0 && (
        <Section title="Observaciones técnicas">
          <ul className="list-disc pl-4 space-y-0.5">{claim.observacionesTecnicas.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </Section>
      )}

      {claim.rechazoItems.length > 0 && (
        <Section title="Unidades rechazadas">
          <ul className="space-y-0.5">{claim.rechazoItems.map((r, i) => <li key={i}>{r.cantidad} × {r.acabado || '—'} — {r.medidaMm || '—'} mm</li>)}</ul>
        </Section>
      )}

      {claim.accionesCorrectivas.length > 0 && (
        <Section title="Acciones correctivas solicitadas">
          <ul className="list-disc pl-4 space-y-0.5">{claim.accionesCorrectivas.map((a, i) => <li key={i}><strong>{a.titulo}:</strong> {a.detalle}</li>)}</ul>
        </Section>
      )}

      {[...claim.fotoEtiquetaPaths, ...claim.fotoDefectoPaths].length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...claim.fotoEtiquetaPaths, ...claim.fotoDefectoPaths].map(p => (
            <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p)} alt="Foto del informe" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
            </a>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500">Realizó: <strong>{claim.realizadoPor}</strong>{claim.cargo ? ` — ${claim.cargo}` : ''}</p>

      <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100">
        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /> Editar</button>
        <button onClick={() => exportSupplierClaimToPDF(claim)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#003366] border border-[#003366] hover:bg-blue-50 rounded-lg"><FileText className="w-3.5 h-3.5" /> Exportar PDF</button>
        <button onClick={() => exportSupplierClaimToWord(claim)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg"><FileType2 className="w-3.5 h-3.5" /> Exportar Word</button>
      </div>
    </div>
  </div>
);

const InfoBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
    <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
    <p className="font-semibold break-words">{value}</p>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
    <p className="text-[10px] font-bold text-[#003366] uppercase">{title}</p>
    {children}
  </div>
);
