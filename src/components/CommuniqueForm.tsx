'use client';

import React, { useRef, useState } from 'react';
import { Sparkles, Plus, Trash2, RefreshCw, Paperclip, FileText } from 'lucide-react';
import { SupplierClaimPhotoGroup, PhotoItem } from './SupplierClaimPhotoGroup';
import { VoiceDictationButton } from './VoiceDictationButton';
import { parseJson, photosFromPaths, buildPhotoMeta, addPhotosToGroup, uploadPhotoGroup, uploadFileToStorage } from './supplierClaimPhotoHelpers';
import { Communique, CommuniqueInput, CommuniqueKind, CommuniqueSigner, CommuniqueStep } from '@/src/lib/communiqueStore';
import { DEFAULT_CLOSING, DEFAULT_SENDER, DEFAULT_SIGNERS, KIND_CONFIG, KIND_ORDER, MAX_REFERENCE_DOCUMENTS, REFERENCE_ROLES, ReferenceRole } from '@/src/lib/communiqueShared';

const INPUT = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]';
const LABEL = 'text-[11px] font-bold text-slate-600 block mb-1';
const MAX_DOCUMENT_MB = 8;
const DOCUMENT_ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png,.webp,.txt';
const DOCUMENT_MIME: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
const fallbackMessage = (motivo?: string) => `La IA no pudo redactar el documento${motivo ? ` (${motivo})` : ''}, así que se usó un texto base. Pulsa "Regenerar con IA" en unos minutos para obtener la redacción completa.`;

/** Adjunto del formulario (ficha técnica o borrador). Solo vive en el navegador: se sube de forma temporal al generar y no se guarda. */
interface DocItem {
  key: string;
  nombre: string;
  rol: ReferenceRole;
  file: File;
}

/** Adjunto ya subido de forma temporal, tal como lo recibe la generación. */
interface UploadedDoc {
  path: string;
  nombre: string;
  rol: ReferenceRole;
}

interface Draft {
  asunto: string;
  intro: string;
  pasos: CommuniqueStep[];
  pies: string[];
  cierre: string;
  sugerencias: string[];
  generadoPorIa: boolean;
  motivo?: string;
}

/** Qué fuentes leyó la IA: documentos de referencia, los que no pudo leer y cantidad de imágenes. */
interface Sources {
  documentosLeidos: string[];
  documentosOmitidos: string[];
  imagenes: number;
}

interface Props {
  initial?: Communique;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}

/** Huella de todo lo que el colaborador puede cambiar: si difiere de la última redacción de la IA, al guardar la IA vuelve a ajustar el documento. */
const snapshotOf = (v: { tipo: string; de: string; para: string; asunto: string; contexto: string; intro: string; pasos: CommuniqueStep[]; cierre: string; pies: string[]; docs: string[] }) => JSON.stringify(v);

const extensionOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

export const CommuniqueForm: React.FC<Props> = ({ initial, onCancel, onSaved }) => {
  const docInputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<CommuniqueKind>(initial?.tipo || 'comunicado');
  const [fecha, setFecha] = useState(initial?.fecha || new Date().toISOString().split('T')[0]);
  const [de, setDe] = useState(initial?.de || DEFAULT_SENDER);
  const [para, setPara] = useState(initial?.para || '');
  const [asunto, setAsunto] = useState(initial?.asunto || '');
  const [contexto, setContexto] = useState(initial?.contexto || '');
  const [documentos, setDocumentos] = useState<DocItem[]>([]);
  const [fotos, setFotos] = useState<PhotoItem[]>(photosFromPaths(initial?.fotoPaths || [], initial?.fotoMeta));
  const [intro, setIntro] = useState(initial?.intro || '');
  const [pasos, setPasos] = useState<CommuniqueStep[]>(initial?.pasos || []);
  const [cierre, setCierre] = useState(initial?.cierre || DEFAULT_CLOSING);
  const [firmantes, setFirmantes] = useState<CommuniqueSigner[]>(initial?.firmantes || DEFAULT_SIGNERS);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [textOpen, setTextOpen] = useState(Boolean(initial));
  const busy = status !== null;

  const currentSnapshot = () => snapshotOf({ tipo, de, para, asunto, contexto, intro, pasos, cierre, pies: fotos.map(f => f.comment.trim()), docs: documentos.map(d => `${d.nombre}:${d.rol}`) });
  const aiSnapshot = useRef<string | null>(null);
  if (aiSnapshot.current === null) aiSnapshot.current = currentSnapshot();

  const addDocuments = (files: FileList | null) => {
    if (!files) return;
    const accepted: DocItem[] = [];
    for (const file of Array.from(files)) {
      if (!DOCUMENT_MIME[extensionOf(file.name)]) return setError('Formato no admitido. Adjunta un PDF, un Word (DOCX), una imagen (JPG, PNG, WEBP) o un archivo de texto (TXT).');
      if (file.size > MAX_DOCUMENT_MB * 1024 * 1024) return setError(`"${file.name}" pesa más de ${MAX_DOCUMENT_MB} MB y la IA no podría leerlo. Comprímelo o adjunta solo las páginas necesarias.`);
      accepted.push({ key: `${Date.now()}-${Math.random()}`, nombre: file.name, rol: /borrador/i.test(file.name) ? 'borrador' : 'ficha', file });
    }
    setError(null);
    setDocumentos(prev => [...prev, ...accepted].slice(0, MAX_REFERENCE_DOCUMENTS));
  };

  /** Sube los adjuntos de forma temporal: la generación los lee una vez y los borra, así que se vuelven a subir cada vez. */
  const uploadDocuments = (): Promise<UploadedDoc[]> =>
    Promise.all(documentos.map(async d => ({ path: await uploadFileToStorage(d.file, '/api/communiques/upload-url', DOCUMENT_MIME[extensionOf(d.nombre)]), nombre: d.nombre, rol: d.rol })));

  const requestDraft = async (fotoPaths: string[], docs: UploadedDoc[]): Promise<{ draft: Draft; fuentes: Sources }> => {
    const res = await fetch('/api/communiques/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, de, para, asunto, contexto, fotoPaths, piesFotos: fotos.map(f => f.comment.trim()), documentos: docs, borrador: { intro, pasos, cierre } })
    });
    const data = await parseJson(res);
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo generar el comunicado.');
    return { draft: data.draft as Draft, fuentes: data.fuentes as Sources };
  };

  /** Aviso con lo que la IA usó como fuente y lo que sugiere para mejorar el documento. */
  const buildNotice = (draft: Draft, fuentes: Sources): string | null => {
    const parts: string[] = [];
    if (fuentes.documentosLeidos.length) parts.push(`La IA leyó: ${fuentes.documentosLeidos.join(', ')}.`);
    if (fuentes.documentosOmitidos.length) parts.push(`No pudo usar: ${fuentes.documentosOmitidos.join(', ')}.`);
    if (fuentes.imagenes) parts.push(`Revisó ${fuentes.imagenes} imagen${fuentes.imagenes > 1 ? 'es' : ''}.`);
    if (draft.sugerencias.length) parts.push(`Para mejorar el documento: ${draft.sugerencias.join(' ')}`);
    return parts.length ? parts.join(' ') : null;
  };

  const applyDraft = (draft: Draft, fuentes: Sources) => {
    aiSnapshot.current = snapshotOf({ tipo, de, para, asunto: draft.asunto || asunto, contexto, intro: draft.intro, pasos: draft.pasos, cierre: draft.cierre, pies: fotos.map((f, i) => f.comment.trim() || draft.pies[i] || ''), docs: documentos.map(d => `${d.nombre}:${d.rol}`) });
    setAsunto(draft.asunto || asunto);
    setIntro(draft.intro);
    setPasos(draft.pasos);
    setCierre(draft.cierre);
    setTextOpen(true);
    setNotice(buildNotice(draft, fuentes));
    setFotos(prev => prev.map((f, i) => ({ ...f, comment: f.comment.trim() || draft.pies[i] || '' })));
  };

  const validate = (): string | null => {
    if (!de.trim() || !para.trim() || !asunto.trim()) return 'Completa De, Para y Asunto.';
    if (!contexto.trim() && !intro.trim() && !documentos.some(d => d.rol === 'borrador')) return 'Describe qué se comunica (el cambio, la mejora o el producto nuevo) o adjunta el borrador del comunicado.';
    return null;
  };

  const uploadAll = async () => {
    setStatus('Subiendo imágenes y documentos...');
    const [fotoPaths, docs] = await Promise.all([uploadPhotoGroup(fotos), uploadDocuments()]);
    setFotos(prev => prev.map((p, i) => ({ ...p, path: fotoPaths[i], file: undefined })));
    return { fotoPaths, docs };
  };

  const regenerate = async () => {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    setNotice(null);
    try {
      const { fotoPaths, docs } = await uploadAll();
      setStatus('Redactando con IA...');
      const { draft, fuentes } = await requestDraft(fotoPaths, docs);
      // Si la IA falla y ya hay texto, se conserva el actual en vez de reemplazarlo por el texto base.
      if (draft.generadoPorIa || pasos.length === 0) applyDraft(draft, fuentes);
      if (!draft.generadoPorIa) setError(`${fallbackMessage(draft.motivo)}${pasos.length ? ' Se conservó el texto actual.' : ''}`);
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
      const { fotoPaths, docs } = await uploadAll();
      let text = { asunto, intro, pasos, cierre };
      let aiNote: string | null = null;
      // Al crear o guardar cambios, la IA vuelve a ajustar el documento si falta el texto o si algo cambió desde su última redacción.
      const needsAi = pasos.length === 0 || currentSnapshot() !== aiSnapshot.current;
      if (needsAi) {
        setStatus('Redactando con IA...');
        try {
          const { draft, fuentes } = await requestDraft(fotoPaths, docs);
          if (draft.generadoPorIa || pasos.length === 0) text = { asunto: draft.asunto || asunto, intro: draft.intro, pasos: draft.pasos, cierre: draft.cierre };
          if (!draft.generadoPorIa) aiNote = `${fallbackMessage(draft.motivo)}${pasos.length ? ' Se guardó el texto actual sin cambios.' : ''}`;
          else aiNote = buildNotice(draft, fuentes) && `El documento se guardó. ${buildNotice(draft, fuentes)}`;
        } catch {
          // El comunicado no se pierde por una falla de la IA: se guarda y el texto se genera después desde Editar.
          aiNote = 'El comunicado se guardó, pero la IA no alcanzó a redactar el texto. Ábrelo con "Editar" y pulsa "Generar texto con IA" para completarlo.';
        }
      }

      if (!text.intro.trim() && text.pasos.length === 0) throw new Error('La IA no pudo redactar el documento a partir del borrador adjunto, así que no se guardó. Intenta de nuevo en unos minutos.');

      setStatus('Guardando...');
      const body: CommuniqueInput = { tipo, fecha, de, para, ...text, contexto, firmantes, fotoPaths, fotoMeta: buildPhotoMeta(fotos, fotoPaths) };
      const res = await fetch(initial ? `/api/communiques/${initial.id}` : '/api/communiques', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await parseJson(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el comunicado.');
      if (aiNote) window.alert(aiNote);
      await onSaved();
    } catch (err: any) {
      setError(err.message);
      setStatus(null);
    }
  };

  const removePhoto = (key: string) => setFotos(prev => prev.filter(p => p.key !== key));
  const updatePhoto = (key: string, patch: Partial<PhotoItem>) => setFotos(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)));
  const updateStep = (idx: number, patch: Partial<CommuniqueStep>) => setPasos(pasos.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const updateSigner = (idx: number, patch: Partial<CommuniqueSigner>) => setFirmantes(firmantes.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={LABEL}>Tipo de documento *</label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de documento">
          {KIND_ORDER.map(kind => {
            const cfg = KIND_CONFIG[kind];
            return (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={tipo === kind}
                disabled={busy || !cfg.available}
                onClick={() => setTipo(kind)}
                className={`px-2 py-2 rounded-lg border text-xs font-bold transition disabled:cursor-not-allowed ${tipo === kind ? 'bg-[#003366] border-[#003366] text-white' : cfg.available ? 'bg-slate-50 border-slate-300 text-slate-600 hover:border-[#003366]' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
              >
                {cfg.label}
                {!cfg.available && <span className="block text-[9px] font-semibold">Próximamente</span>}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">{KIND_CONFIG[tipo].hint} La IA redacta el texto con la plantilla oficial.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>De *</label><input className={INPUT} value={de} onChange={e => setDe(e.target.value)} /></div>
        <div><label className={LABEL}>Fecha *</label><input type="date" className={INPUT} value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div><label className={LABEL}>Para (áreas o procesos) *</label><input className={INPUT} value={para} onChange={e => setPara(e.target.value)} placeholder="Ej: Vidrio templado, Laminado" /></div>
        <div><label className={LABEL}>Asunto *</label><input className={INPUT} value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Ej: Marcado de vidrio laminado templado claro" /></div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className={LABEL + ' mb-0'}>¿Qué se comunica o qué quieres que redacte la IA?{documentos.some(d => d.rol === 'borrador') ? ' (opcional con borrador)' : ' *'}</label>
          <VoiceDictationButton disabled={busy} onTranscript={text => setContexto(prev => (prev.trim() ? `${prev.trim()} ${text}` : text))} />
        </div>
        <textarea className={INPUT} rows={4} value={contexto} onChange={e => setContexto(e.target.value)} placeholder="Escribe o dicta con el micrófono: describe el cambio, la mejora de diseño o el producto nuevo (qué cambia, en qué áreas aplica, cómo se hace), o dale una instrucción, por ejemplo &quot;explica en detalle el proceso de ensamble de este marco&quot;. Si adjuntas un borrador del comunicado, no necesitas escribir esto: la IA parte de él. Al guardar, la IA ordena y redacta todo con la plantilla oficial." />
        <button type="button" onClick={regenerate} disabled={busy} className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#003366] border border-[#003366] rounded-lg px-3 py-1.5 disabled:opacity-50">
          <Sparkles className="w-3 h-3" /> {pasos.length ? 'Regenerar con IA' : 'Generar texto con IA'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={LABEL + ' mb-0'}>Documentos adjuntos: ficha técnica o borrador (opcional)</label>
          <button type="button" disabled={busy || documentos.length >= MAX_REFERENCE_DOCUMENTS} onClick={() => docInputRef.current?.click()} className="text-[11px] font-bold text-[#003366] flex items-center gap-1 disabled:opacity-50"><Paperclip className="w-3 h-3" /> Adjuntar documento</button>
          <input ref={docInputRef} type="file" accept={DOCUMENT_ACCEPT} multiple className="hidden" onChange={e => { addDocuments(e.target.files); e.target.value = ''; }} />
        </div>
        <p className="text-[10px] text-slate-500">Adjunta la ficha técnica del producto y, si ya tienes uno adelantado, el borrador del comunicado (PDF, Word, imagen o TXT; hasta {MAX_REFERENCE_DOCUMENTS} archivos de {MAX_DOCUMENT_MB} MB). La IA parte del borrador y toma los datos de la ficha. Los adjuntos solo se usan para redactar: no se guardan en el sistema.</p>
        {documentos.map(d => (
          <div key={d.key} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 min-w-0"><FileText className="w-3.5 h-3.5 text-[#003366] shrink-0" /><span className="truncate">{d.nombre}</span></span>
            <span className="flex items-center gap-2 shrink-0">
              <select aria-label={`Tipo de documento de ${d.nombre}`} disabled={busy} value={d.rol} onChange={e => setDocumentos(prev => prev.map(x => (x.key === d.key ? { ...x, rol: e.target.value as ReferenceRole } : x)))} className="bg-white border border-slate-300 rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-700">
                {(Object.keys(REFERENCE_ROLES) as ReferenceRole[]).map(role => <option key={role} value={role}>{REFERENCE_ROLES[role]}</option>)}
              </select>
              <button type="button" disabled={busy} onClick={() => setDocumentos(prev => prev.filter(x => x.key !== d.key))} aria-label="Quitar documento"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" /></button>
            </span>
          </div>
        ))}
      </div>

      <SupplierClaimPhotoGroup title="Imágenes del comunicado (el comentario de cada una es su pie de foto)" photos={fotos} disabled={busy} onAdd={f => addPhotosToGroup(f, setFotos)} onRemove={removePhoto} onUpdate={updatePhoto} />

      <details className="border border-slate-200 rounded-xl p-3 bg-slate-50" open={textOpen} onToggle={e => setTextOpen(e.currentTarget.open)}>
        <summary className="text-xs font-bold text-slate-700 cursor-pointer">Texto del documento (lo redacta la IA; puedes ajustarlo)</summary>
        <div className="space-y-3 mt-3">
          <div><label className={LABEL}>Introducción</label><textarea className={INPUT} rows={4} value={intro} onChange={e => setIntro(e.target.value)} placeholder="La redacta la IA. Si la ajustas aquí, pulsa &quot;Regenerar con IA&quot; para que la IA pula tu versión. Puedes resaltar términos con **asteriscos dobles**." /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={LABEL + ' mb-0'}>{KIND_CONFIG[tipo].stepsHeading.replace(/:$/, '')}</label>
              <button type="button" onClick={() => setPasos([...pasos, { titulo: '', detalle: '' }])} className="text-[11px] font-bold text-[#003366] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar paso</button>
            </div>
            {pasos.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex gap-2">
                  <input className={INPUT + ' font-bold'} value={s.titulo} onChange={e => updateStep(idx, { titulo: e.target.value })} placeholder={`Paso ${idx + 1}`} />
                  <button type="button" onClick={() => setPasos(pasos.filter((_, i) => i !== idx))} aria-label="Quitar paso"><Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" /></button>
                </div>
                <textarea className={INPUT} rows={2} value={s.detalle} onChange={e => updateStep(idx, { detalle: e.target.value })} />
              </div>
            ))}
          </div>
          <div><label className={LABEL}>Cierre</label><input className={INPUT} value={cierre} onChange={e => setCierre(e.target.value)} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={LABEL + ' mb-0'}>Firmas</label>
              <button type="button" onClick={() => setFirmantes([...firmantes, { nombre: '', cargo: '' }])} className="text-[11px] font-bold text-[#003366] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar firma</button>
            </div>
            {firmantes.map((f, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_28px] gap-2">
                <input className={INPUT} value={f.nombre} onChange={e => updateSigner(idx, { nombre: e.target.value })} placeholder="Nombre" />
                <input className={INPUT} value={f.cargo} onChange={e => updateSigner(idx, { cargo: e.target.value })} placeholder="Cargo" />
                <button type="button" onClick={() => setFirmantes(firmantes.filter((_, i) => i !== idx))} aria-label="Quitar firma"><Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" /></button>
              </div>
            ))}
          </div>
        </div>
      </details>

      {notice && <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900">{notice}</div>}
      {error && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={busy} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {status}</> : <><Sparkles className="w-3.5 h-3.5" /> {initial ? 'Guardar cambios' : 'Registrar y generar documento'}</>}
        </button>
      </div>
    </form>
  );
};
