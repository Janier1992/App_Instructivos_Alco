'use client';

import React, { useState } from 'react';
import { X, PenLine, Trash2, CheckCircle2 } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { compactSignature } from '@/src/lib/signatureImage';
import type { Communique } from '@/src/lib/communiqueStore';

interface Props {
  communique: Communique;
  onClose: () => void;
  /** Recibe el comunicado actualizado para refrescar la lista. */
  onChanged: (communique: Communique) => void;
}

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '');

/** Cada responsable firma su casilla del comunicado directamente en la app, dibujando su firma. */
export const CommuniqueSignModal: React.FC<Props> = ({ communique, onClose, onChanged }) => {
  const [signingIndex, setSigningIndex] = useState<number | null>(null);
  const [drawn, setDrawn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (index: number, drawing: string | null) => {
    setSaving(true);
    setError(null);
    try {
      const firma = drawing ? await compactSignature(drawing) : null;
      const res = await fetch(`/api/communiques/${communique.id}/sign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index, firma }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar la firma.');
      onChanged(data.communique as Communique);
      setSigningIndex(null);
      setDrawn('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeSignature = (index: number, nombre: string) => {
    if (window.confirm(`¿Quitar la firma de ${nombre}? Tendrá que firmar de nuevo.`)) submit(index, null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900">Firmar el comunicado</h3>
            <p className="text-xs text-slate-500 mt-0.5">{communique.asunto}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {communique.firmantes.length === 0 && <p className="text-xs text-slate-500">Este comunicado no tiene firmantes. Agrégalos con "Editar".</p>}

        <ul className="space-y-3">
          {communique.firmantes.map((signer, index) => (
            <li key={index} className="border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{signer.nombre}</p>
                  <p className="text-[11px] text-slate-500">{signer.cargo}</p>
                </div>
                {signer.firma ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Firmado</span>
                ) : (
                  signingIndex !== index && <button type="button" onClick={() => { setSigningIndex(index); setDrawn(''); setError(null); }} className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#003366] rounded-lg px-3 py-1.5"><PenLine className="w-3 h-3" /> Firmar</button>
                )}
              </div>

              {signer.firma && (
                <div className="flex items-end justify-between gap-2">
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signer.firma} alt={`Firma de ${signer.nombre}`} className="h-14 max-w-[220px] object-contain border-b border-slate-300" />
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(signer.firmadoEn)}</p>
                  </div>
                  <button type="button" onClick={() => removeSignature(index, signer.nombre)} disabled={saving} className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline disabled:opacity-50"><Trash2 className="w-3 h-3" /> Quitar firma</button>
                </div>
              )}

              {signingIndex === index && !signer.firma && (
                <div className="space-y-2">
                  <SignaturePad label={`Firma de ${signer.nombre}`} initialValue={null} onChange={setDrawn} accentClassName="border-sky-200" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setSigningIndex(null); setDrawn(''); }} disabled={saving} className="text-[11px] font-bold text-slate-600 px-3 py-1.5 disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={() => submit(index, drawn)} disabled={!drawn || saving} className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#003366] rounded-lg px-3 py-1.5 disabled:opacity-50"><PenLine className="w-3 h-3" /> {saving ? 'Guardando...' : 'Guardar firma'}</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}
        <p className="text-[10px] text-slate-500">Firma solo en tu casilla. La firma queda en el comunicado y aparece en el Word y el PDF.</p>
      </div>
    </div>
  );
};
