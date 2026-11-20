'use client';

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { compactSignature } from '@/src/lib/signatureImage';

interface Props {
  /** Nombre de quien firma, para el título del recuadro. */
  signerName: string;
  onSave: (compactPngDataUrl: string) => void;
  onClose: () => void;
}

/** Ventana para que una persona dibuje su firma; entrega la firma recortada a su trazo y liviana. */
export const SignatureDialog: React.FC<Props> = ({ signerName, onSave, onClose }) => {
  const [drawn, setDrawn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSave(await compactSignature(drawn));
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Firma</h4>
            <p className="text-xs text-slate-500">{signerName || 'Colaborador'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <SignaturePad label="Firma con el dedo, el lápiz o el mouse" initialValue={null} onChange={setDrawn} accentClassName="border-sky-200" />
        {error && <p className="text-[11px] font-medium text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={save} disabled={!drawn || saving} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] rounded-lg disabled:opacity-50"><Check className="w-3 h-3" /> {saving ? 'Guardando...' : 'Guardar firma'}</button>
        </div>
      </div>
    </div>
  );
};
