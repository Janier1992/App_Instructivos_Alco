'use client';

import React, { useRef, useState } from 'react';
import { Sparkles, Camera, X, Plus, Trash2, RefreshCw } from 'lucide-react';
import { compressImageFile } from '@/src/lib/imageCompression';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';
import type { SupplierClaim, SupplierClaimInput, SupplierClaimRejectItem, SupplierClaimAction } from '@/src/lib/supplierClaimsStore';

const PHOTO_BUCKET = 'supplier-claim-photos';
const MAX_PHOTOS_PER_GROUP = 6;
const INPUT = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]';
const LABEL = 'text-[11px] font-bold text-slate-600 block mb-1';

/** Foto del formulario: ya guardada (path en Storage) o recién elegida (archivo pendiente de subir). */
interface PhotoItem {
  key: string;
  path?: string;
  file?: File;
  previewUrl: string;
}

interface Props {
  initial?: SupplierClaim;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    throw new Error('El servidor no respondió correctamente. Intenta de nuevo.');
  }
}

function photosFromPaths(paths: string[]): PhotoItem[] {
  return paths.map(p => ({ key: p, path: p, previewUrl: `/api/supplier-claims/photo?path=${encodeURIComponent(p)}` }));
}

export const SupplierClaimForm: React.FC<Props> = ({ initial, onCancel, onSaved }) => {
  const [fecha, setFecha] = useState(initial?.fechaInforme || new Date().toISOString().split('T')[0]);
  const [proveedor, setProveedor] = useState(initial?.proveedor || '');
  const [materiaPrima, setMateriaPrima] = useState(initial?.materiaPrima || '');
  const [referencias, setReferencias] = useState(initial?.referencias || '');
  const [lotes, setLotes] = useState(initial?.lotes || '');
  const [observacion, setObservacion] = useState(initial?.observacionInspector || '');
  const [realizadoPor, setRealizadoPor] = useState(initial?.realizadoPor || '');
  const [cargo, setCargo] = useState(initial?.cargo || 'Asistente de Calidad');
  const [rechazo, setRechazo] = useState<SupplierClaimRejectItem[]>(initial?.rechazoItems || []);
  const [etiquetas, setEtiquetas] = useState<PhotoItem[]>(photosFromPaths(initial?.fotoEtiquetaPaths || []));
  const [defectos, setDefectos] = useState<PhotoItem[]>(photosFromPaths(initial?.fotoDefectoPaths || []));
  const [defectoTitulo, setDefectoTitulo] = useState(initial?.defectoTitulo || '');
  const [descripcionNc, setDescripcionNc] = useState(initial?.descripcionNc || '');
  const [observaciones, setObservaciones] = useState((initial?.observacionesTecnicas || []).join('\n'));
  const [acciones, setAcciones] = useState<SupplierClaimAction[]>(initial?.accionesCorrectivas || []);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = status !== null;

  const addPhotos = async (files: FileList | null, group: PhotoItem[], setGroup: (p: PhotoItem[]) => void) => {
    if (!files) return;
    const added: PhotoItem[] = [];
    for (const file of Array.from(files).slice(0, MAX_PHOTOS_PER_GROUP - group.length)) {
      const compressed = await compressImageFile(file);
      const blob = await (await fetch(compressed.previewUrl)).blob();
      const jpeg = new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
      added.push({ key: `${Date.now()}-${Math.random()}`, file: jpeg, previewUrl: compressed.previewUrl });
    }
    setGroup([...group, ...added]);
  };

  /** Sube las fotos nuevas a Storage y devuelve los paths finales del grupo. */
  const uploadGroup = async (group: PhotoItem[]): Promise<string[]> => {
    const supabase = getSupabaseBrowserClient();
    const paths: string[] = [];
    for (const photo of group) {
      if (photo.path) {
        paths.push(photo.path);
        continue;
      }
      if (!photo.file) continue;
      if (!supabase) throw new Error('Carga de fotos no disponible: falta configuración del servidor.');
      const urlRes = await fetch('/api/supplier-claims/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: photo.file.name })
      });
      const urlData = await parseJson(urlRes);
      if (!urlRes.ok || !urlData.success) throw new Error(urlData.error || 'No se pudo iniciar la carga de la foto.');
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).uploadToSignedUrl(urlData.storagePath, urlData.token, photo.file, { contentType: 'image/jpeg' });
      if (upErr) throw new Error(upErr.message);
      paths.push(urlData.storagePath);
    }
    return paths;
  };

  const requestDraft = async (defectoPaths: string[]) => {
    const res = await fetch('/api/supplier-claims/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proveedor, materiaPrima, referencias, lotes, observacionInspector: observacion, fotoDefectoPaths: defectoPaths })
    });
    const data = await parseJson(res);
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo generar el informe.');
    return data.draft as { defectoTitulo: string; descripcionNc: string; observacionesTecnicas: string[]; accionesCorrectivas: SupplierClaimAction[] };
  };

  const validate = (): string | null => {
    if (!proveedor.trim() || !materiaPrima.trim() || !referencias.trim()) return 'Completa proveedor, materia prima/insumo y referencia.';
    if (!observacion.trim()) return 'Describe la novedad encontrada en la inspección.';
    if (!realizadoPor.trim()) return 'Escribe el nombre de quien realizó la inspección.';
    return null;
  };

  const regenerate = async () => {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    try {
      setStatus('Subiendo fotos...');
      const uploaded = await uploadGroup(defectos);
      setDefectos(prev => prev.map((p, i) => ({ ...p, path: uploaded[i], file: undefined })));
      setStatus('Redactando informe con IA...');
      const draft = await requestDraft(uploaded);
      setDefectoTitulo(draft.defectoTitulo);
      setDescripcionNc(draft.descripcionNc);
      setObservaciones(draft.observacionesTecnicas.join('\n'));
      setAcciones(draft.accionesCorrectivas);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStatus(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);

    try {
      setStatus('Subiendo fotos...');
      const etiquetaPaths = await uploadGroup(etiquetas);
      const defectoPaths = await uploadGroup(defectos);

      let draft = { defectoTitulo, descripcionNc, observacionesTecnicas: observaciones.split('\n').map(o => o.trim()).filter(Boolean), accionesCorrectivas: acciones };
      if (!descripcionNc.trim()) {
        setStatus('Redactando informe con IA...');
        draft = await requestDraft(defectoPaths);
      }

      setStatus('Guardando informe...');
      const body: SupplierClaimInput = {
        fechaInforme: fecha,
        proveedor,
        materiaPrima,
        referencias,
        lotes,
        observacionInspector: observacion,
        defectoTitulo: draft.defectoTitulo,
        descripcionNc: draft.descripcionNc,
        observacionesTecnicas: draft.observacionesTecnicas,
        accionesCorrectivas: draft.accionesCorrectivas,
        rechazoItems: rechazo.filter(r => Number(r.cantidad) > 0),
        fotoEtiquetaPaths: etiquetaPaths,
        fotoDefectoPaths: defectoPaths,
        realizadoPor,
        cargo
      };
      const res = await fetch(initial ? `/api/supplier-claims/${initial.id}` : '/api/supplier-claims', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await parseJson(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el informe.');
      await onSaved();
    } catch (err: any) {
      setError(err.message);
      setStatus(null);
    }
  };

  const updateReject = (idx: number, patch: Partial<SupplierClaimRejectItem>) => setRechazo(rechazo.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const updateAction = (idx: number, patch: Partial<SupplierClaimAction>) => setAcciones(acciones.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Proveedor *</label><input className={INPUT} value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Ej: ALUMTEK S.A.S." /></div>
        <div><label className={LABEL}>Fecha del informe *</label><input type="date" className={INPUT} value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div><label className={LABEL}>Materia prima / insumo *</label><input className={INPUT} value={materiaPrima} onChange={e => setMateriaPrima(e.target.value)} placeholder="Ej: ALUMINIO — Perfil Ángulo" /></div>
        <div><label className={LABEL}>Referencia(s) *</label><input className={INPUT} value={referencias} onChange={e => setReferencias(e.target.value)} placeholder="Ej: A-0046" /></div>
        <div className="sm:col-span-2"><label className={LABEL}>Número(s) de lote</label><input className={INPUT} value={lotes} onChange={e => setLotes(e.target.value)} placeholder="Ej: N° 15135-1" /></div>
      </div>

      <PhotoGroup title="Fotos de la etiqueta del material (trazabilidad)" photos={etiquetas} disabled={busy} onAdd={f => addPhotos(f, etiquetas, setEtiquetas)} onRemove={k => setEtiquetas(etiquetas.filter(p => p.key !== k))} />
      <PhotoGroup title="Fotos del defecto *" photos={defectos} disabled={busy} onAdd={f => addPhotos(f, defectos, setDefectos)} onRemove={k => setDefectos(defectos.filter(p => p.key !== k))} />

      <div>
        <label className={LABEL}>Novedad encontrada / tu análisis *</label>
        <textarea className={INPUT} rows={4} value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Describe qué se presentó: defecto, cómo se detectó, extensión, etc. La IA lo redactará en el formato oficial." />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={LABEL + ' mb-0'}>Acciones inmediatas — unidades rechazadas</label>
          <button type="button" onClick={() => setRechazo([...rechazo, { cantidad: 0, acabado: '', medidaMm: '' }])} className="text-[11px] font-bold text-[#003366] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar fila</button>
        </div>
        {rechazo.map((r, idx) => (
          <div key={idx} className="grid grid-cols-[80px_1fr_100px_28px] gap-2">
            <input type="number" min={0} className={INPUT} value={r.cantidad || ''} onChange={e => updateReject(idx, { cantidad: Number(e.target.value) })} placeholder="Cant." />
            <input className={INPUT} value={r.acabado} onChange={e => updateReject(idx, { acabado: e.target.value })} placeholder="Acabado (Crudo, Pintura bronce...)" />
            <input className={INPUT} value={r.medidaMm} onChange={e => updateReject(idx, { medidaMm: e.target.value })} placeholder="Medida mm" />
            <button type="button" onClick={() => setRechazo(rechazo.filter((_, i) => i !== idx))} aria-label="Quitar fila"><Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" /></button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Realizó (nombre) *</label><input className={INPUT} value={realizadoPor} onChange={e => setRealizadoPor(e.target.value)} /></div>
        <div><label className={LABEL}>Cargo</label><input className={INPUT} value={cargo} onChange={e => setCargo(e.target.value)} /></div>
      </div>

      <details className="border border-slate-200 rounded-xl p-3 bg-slate-50" open={Boolean(initial)}>
        <summary className="text-xs font-bold text-[#003366] cursor-pointer flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Texto del informe (lo redacta la IA; puedes ajustarlo)</summary>
        <div className="space-y-3 mt-3">
          <p className="text-[11px] text-slate-500">Si lo dejas vacío, se genera automáticamente al registrar el informe.</p>
          <div><label className={LABEL}>Defecto</label><input className={INPUT} value={defectoTitulo} onChange={e => setDefectoTitulo(e.target.value)} /></div>
          <div><label className={LABEL}>Descripción de la no conformidad</label><textarea className={INPUT} rows={6} value={descripcionNc} onChange={e => setDescripcionNc(e.target.value)} /></div>
          <div><label className={LABEL}>Observaciones técnicas (una por línea)</label><textarea className={INPUT} rows={4} value={observaciones} onChange={e => setObservaciones(e.target.value)} /></div>
          {acciones.map((a, idx) => (
            <div key={idx} className="space-y-1">
              <input className={INPUT + ' font-bold'} value={a.titulo} onChange={e => updateAction(idx, { titulo: e.target.value })} />
              <textarea className={INPUT} rows={2} value={a.detalle} onChange={e => updateAction(idx, { detalle: e.target.value })} />
            </div>
          ))}
          <button type="button" onClick={regenerate} disabled={busy} className="flex items-center gap-1.5 text-[11px] font-bold text-[#003366] border border-[#003366] rounded-lg px-3 py-1.5 disabled:opacity-50">
            <RefreshCw className="w-3 h-3" /> {descripcionNc ? 'Regenerar con IA' : 'Generar texto con IA'}
          </button>
        </div>
      </details>

      {error && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={busy} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {status}</> : <><Sparkles className="w-3.5 h-3.5" /> {initial ? 'Guardar cambios' : 'Registrar y generar informe'}</>}
        </button>
      </div>
    </form>
  );
};

const PhotoGroup: React.FC<{ title: string; photos: PhotoItem[]; disabled: boolean; onAdd: (files: FileList | null) => void; onRemove: (key: string) => void }> = ({ title, photos, disabled, onAdd, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className={LABEL}>{title}</label>
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div key={p.key} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onRemove(p.key)} disabled={disabled} aria-label="Quitar foto" className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS_PER_GROUP && (
          <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:text-[#003366] hover:border-[#003366] flex flex-col items-center justify-center gap-1 text-[10px] font-bold">
            <Camera className="w-5 h-5" /> Agregar
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { onAdd(e.target.files); e.target.value = ''; }} />
    </div>
  );
};
