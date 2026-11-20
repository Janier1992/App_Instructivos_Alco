'use client';

import React from 'react';
import { KIND_CONFIG } from '@/src/lib/communiqueShared';

export type DocumentType = 'comunicado' | 'procedimiento' | 'divulgacion';

const TILES: { type: DocumentType; label: string; available: boolean; hint: string }[] = [
  { type: 'comunicado', label: KIND_CONFIG.comunicado.label, available: true, hint: `${KIND_CONFIG.comunicado.hint} La IA redacta el texto con la plantilla oficial.` },
  { type: 'procedimiento', label: KIND_CONFIG.procedimiento.label, available: false, hint: KIND_CONFIG.procedimiento.hint },
  { type: 'divulgacion', label: 'Divulgación', available: true, hint: 'Planilla de asistencia: registra a cada persona a la que se le divulga un comunicado, con su cédula, su proceso o sección y su firma.' }
];

interface Props {
  active: DocumentType;
  onSelect: (type: DocumentType) => void;
  disabled?: boolean;
}

/** Selector del tipo de documento del módulo (Comunicado, Procedimiento o Divulgación); cada tipo muestra sus propios campos. */
export const DocumentTypeTiles: React.FC<Props> = ({ active, onSelect, disabled }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-600 block mb-1">Tipo de documento *</label>
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de documento">
      {TILES.map(tile => (
        <button
          key={tile.type}
          type="button"
          role="radio"
          aria-checked={active === tile.type}
          disabled={disabled || !tile.available}
          onClick={() => onSelect(tile.type)}
          className={`px-2 py-2 rounded-lg border text-xs font-bold transition disabled:cursor-not-allowed ${active === tile.type ? 'bg-[#003366] border-[#003366] text-white' : tile.available ? 'bg-slate-50 border-slate-300 text-slate-600 hover:border-[#003366]' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
        >
          {tile.label}
          {!tile.available && <span className="block text-[9px] font-semibold">Próximamente</span>}
        </button>
      ))}
    </div>
    <p className="text-[10px] text-slate-500 mt-1">{TILES.find(t => t.type === active)?.hint}</p>
  </div>
);
