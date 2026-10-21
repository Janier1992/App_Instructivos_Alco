'use client';

import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Pencil, X } from 'lucide-react';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { PhotoMarkEditor } from './PhotoMarkEditor';
import { MarkedImage } from './MarksOverlay';
import type { PhotoMark } from '@/src/lib/photoMarks';

export const MAX_PHOTOS_PER_GROUP = 6;

/** Foto del formulario: ya guardada (path en Storage) o recién elegida (archivo pendiente de subir), con su comentario y marcas. */
export interface PhotoItem {
  key: string;
  path?: string;
  file?: File;
  previewUrl: string;
  comment: string;
  marks: PhotoMark[];
}

interface Props {
  title: string;
  photos: PhotoItem[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<PhotoItem>) => void;
}

const LABEL = 'text-[11px] font-bold text-slate-600 block mb-1';
const ADD_BUTTON = 'h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:text-[#003366] hover:border-[#003366] flex flex-col items-center justify-center gap-1 text-[10px] font-bold disabled:opacity-50';

/** Grupo de fotos del informe: tomar foto o subir archivo, comentario debajo de cada una y marcas sobre el defecto. */
export const SupplierClaimPhotoGroup: React.FC<Props> = ({ title, photos, disabled, onAdd, onRemove, onUpdate }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const marking = photos.find(p => p.key === markingKey) || null;

  return (
    <div>
      <label className={LABEL}>{title}</label>
      <div className="flex flex-wrap gap-3">
        {photos.map(photo => (
          <div key={photo.key} className="w-36 space-y-1.5">
            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 h-24">
              <MarkedImage src={photo.previewUrl} marks={photo.marks} className="w-full h-full" />
              <button type="button" onClick={() => onRemove(photo.key)} disabled={disabled} aria-label="Quitar foto" className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
            </div>
            <button
              type="button"
              onClick={() => setMarkingKey(photo.key)}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-[#003366] border border-[#003366]/40 rounded-md hover:bg-blue-50 disabled:opacity-50"
            >
              <Pencil className="w-3 h-3" /> {photo.marks.length > 0 ? `Marcas (${photo.marks.length})` : 'Señalar defecto'}
            </button>
            <textarea
              value={photo.comment}
              onChange={e => onUpdate(photo.key, { comment: e.target.value })}
              disabled={disabled}
              rows={2}
              placeholder="Comentario de la foto"
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>
        ))}
        {photos.length < MAX_PHOTOS_PER_GROUP && (
          <div className="flex gap-2 self-start">
            <button type="button" disabled={disabled} onClick={() => setCameraOpen(true)} className={ADD_BUTTON}>
              <Camera className="w-5 h-5" /> Tomar foto
            </button>
            <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className={ADD_BUTTON}>
              <ImagePlus className="w-5 h-5" /> Subir archivo
            </button>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { onAdd(Array.from(e.target.files || [])); e.target.value = ''; }} />

      {cameraOpen && (
        <PhotoCaptureModal
          remaining={MAX_PHOTOS_PER_GROUP - photos.length}
          onCapture={file => onAdd([file])}
          onClose={() => setCameraOpen(false)}
          onUseFiles={() => { setCameraOpen(false); inputRef.current?.click(); }}
        />
      )}

      {marking && (
        <PhotoMarkEditor
          imageSrc={marking.previewUrl}
          marks={marking.marks}
          onSave={marks => { onUpdate(marking.key, { marks }); setMarkingKey(null); }}
          onClose={() => setMarkingKey(null)}
        />
      )}
    </div>
  );
};
