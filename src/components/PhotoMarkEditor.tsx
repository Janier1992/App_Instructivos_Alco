'use client';

import React, { useRef, useState } from 'react';
import { Circle, Square, MoveUpRight, Type, Undo2, Trash2, X, Check } from 'lucide-react';
import { MarksOverlay } from './MarksOverlay';
import { PhotoMark, MarkType, isMeaningfulMark } from '@/src/lib/photoMarks';

interface Props {
  imageSrc: string;
  marks: PhotoMark[];
  onSave: (marks: PhotoMark[]) => void;
  onClose: () => void;
}

const TOOLS: { type: MarkType; label: string; icon: React.ReactNode }[] = [
  { type: 'rect', label: 'Recuadro', icon: <Square className="w-4 h-4" /> },
  { type: 'circle', label: 'Círculo', icon: <Circle className="w-4 h-4" /> },
  { type: 'arrow', label: 'Flecha', icon: <MoveUpRight className="w-4 h-4" /> },
  { type: 'label', label: 'Etiqueta', icon: <Type className="w-4 h-4" /> }
];

/**
 * Editor para señalar el defecto sobre una foto: recuadro, círculo, flecha o
 * etiqueta de texto. Se dibuja arrastrando sobre la foto (mouse o dedo); la
 * etiqueta se coloca tocando el punto donde debe ir. Las marcas se guardan
 * como vectores, la foto original no se modifica.
 */
export const PhotoMarkEditor: React.FC<Props> = ({ imageSrc, marks: initialMarks, onSave, onClose }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<PhotoMark[]>(initialMarks);
  const [tool, setTool] = useState<MarkType>('rect');
  const [labelText, setLabelText] = useState('');
  const [draft, setDraft] = useState<PhotoMark | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const toNormalized = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = frameRef.current!.getBoundingClientRect();
    return { x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1), y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1) };
  };

  const handleDown = (e: React.PointerEvent) => {
    const { x, y } = toNormalized(e);
    if (tool === 'label') {
      if (!labelText.trim()) return;
      setMarks(prev => [...prev, { type: 'label', x1: x, y1: y, x2: x, y2: y, text: labelText.trim() }]);
      setLabelText('');
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraft({ type: tool, x1: x, y1: y, x2: x, y2: y });
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!draft) return;
    const { x, y } = toNormalized(e);
    setDraft({ ...draft, x2: x, y2: y });
  };

  const handleUp = () => {
    if (draft && isMeaningfulMark(draft)) setMarks(prev => [...prev, draft]);
    setDraft(null);
  };

  const visibleMarks = draft ? [...marks, draft] : marks;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[96vh] overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">Señalar el defecto en la foto</h4>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {TOOLS.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => setTool(t.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${tool === t.type ? 'bg-[#003366] text-white border-[#003366]' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" onClick={() => setMarks(marks.slice(0, -1))} disabled={marks.length === 0} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg disabled:opacity-40"><Undo2 className="w-3.5 h-3.5" /> Deshacer</button>
          <button type="button" onClick={() => setMarks([])} disabled={marks.length === 0} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 border border-rose-200 rounded-lg disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /> Borrar todo</button>
        </div>

        {tool === 'label' ? (
          <input
            value={labelText}
            onChange={e => setLabelText(e.target.value)}
            placeholder="Escribe el texto de la etiqueta (ej: Línea de grafito) y luego toca la foto donde debe ir"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
        ) : (
          <p className="text-[11px] text-slate-500">Arrastra sobre la foto para dibujar. Usa una Etiqueta para nombrar el defecto y una Flecha para apuntarlo.</p>
        )}

        <div className="flex justify-center bg-slate-100 rounded-xl p-2">
          <div
            ref={frameRef}
            className="relative inline-block touch-none select-none cursor-crosshair"
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt="Foto a marcar" draggable={false} className="block max-h-[58vh] max-w-full" onLoad={e => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
            <MarksOverlay marks={visibleMarks} width={size.w} height={size.h} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg">Cancelar</button>
          <button type="button" onClick={() => onSave(marks)} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Guardar marcas</button>
        </div>
      </div>
    </div>
  );
};
