'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, MicOff, Sparkles, Ruler, Layers, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { compressImageFile } from '@/src/lib/imageCompression';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';
import { FieldInspectionMeasureTool } from './FieldInspectionMeasureTool';
import {
  AREAS_PROCESO,
  ESTADO_OPTIONS,
  DEFECTO_TYPES,
  DISENO_REFERENCIA_OPTIONS,
  REGISTRO_USERS,
  OPERARIO_RESPONSABLES,
  ACCION_CORRECTIVA_OPTIONS,
  OBSERVACIONES_SUGERIDAS
} from '@/src/data/fieldInspectionOptions';

export interface FieldInspectionFormValues {
  fecha: string;
  areaProceso: string;
  op: string;
  planoOpc: string;
  disenoReferencia: string;
  cantTotal: number;
  cantRetenida: number;
  estado: string;
  defecto: string;
  reviso: string;
  responsable: string;
  accionCorrectiva: string;
  observacionSugerida: string;
  observacion: string;
  photoStoragePath: string;
  alertLevel: 'None' | 'Warning' | 'Critical';
  aiMetadata: Record<string, unknown> | null;
}

const EMPTY_FORM: FieldInspectionFormValues = {
  fecha: new Date().toISOString().split('T')[0],
  areaProceso: '',
  op: '',
  planoOpc: '',
  disenoReferencia: '',
  cantTotal: 0,
  cantRetenida: 0,
  estado: 'Aprobado',
  defecto: 'NINGUNO',
  reviso: '',
  responsable: '',
  accionCorrectiva: 'NA',
  observacionSugerida: '',
  observacion: '',
  photoStoragePath: '',
  alertLevel: 'None',
  aiMetadata: null
};

async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return { error: `Respuesta inesperada del servidor (${res.status}).` };
  return res.json();
}

interface Props {
  initial?: Partial<FieldInspectionFormValues>;
  initialPhotoUrl?: string | null;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: (values: FieldInspectionFormValues) => Promise<void>;
}

export const FieldInspectionForm: React.FC<Props> = ({ initial, initialPhotoUrl, isEditing, onCancel, onSubmit }) => {
  const [values, setValues] = useState<FieldInspectionFormValues>({ ...EMPTY_FORM, ...initial });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(initialPhotoUrl || null);
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiTool, setAiTool] = useState<'none' | 'measure'>('none');
  const [analyzing, setAnalyzing] = useState<'defect' | 'count' | null>(null);
  const [detectedUnits, setDetectedUnits] = useState<{ id: number; box2d: [number, number, number, number] }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!Ctor);
  }, []);

  const set = <K extends keyof FieldInspectionFormValues>(key: K, value: FieldInspectionFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const toggleVoice = () => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) set('observacion', values.observacion.trim() ? `${values.observacion.trim()} ${transcript}` : transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handlePhotoSelected = async (file: File) => {
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      const blob = await (await fetch(compressed.previewUrl)).blob();
      const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      setPhotoFile(compressedFile);
      setPhotoPreviewUrl(compressed.previewUrl);
      set('photoStoragePath', '');
      setDetectedUnits([]);
    } catch (err: any) {
      setError(err?.message || 'No se pudo procesar la foto.');
    }
  };

  /** Sube la foto a Storage si aún no se ha subido, y devuelve el storagePath. */
  const ensurePhotoUploaded = async (): Promise<{ storagePath: string; contentType: string } | null> => {
    if (values.photoStoragePath) return { storagePath: values.photoStoragePath, contentType: 'image/jpeg' };
    if (!photoFile) return null;

    const urlRes = await fetch('/api/crm/field-inspections/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: photoFile.name })
    });
    const urlData = await parseJsonResponse(urlRes);
    if (!urlRes.ok || !urlData.success) throw new Error(urlData.error || 'No se pudo iniciar la carga de la foto.');

    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error('Carga de fotos no disponible: falta configuración del servidor.');
    const { error: uploadErr } = await supabase.storage
      .from('field-inspection-photos')
      .uploadToSignedUrl(urlData.storagePath, urlData.token, photoFile, { contentType: 'image/jpeg' });
    if (uploadErr) throw new Error(uploadErr.message);

    set('photoStoragePath', urlData.storagePath);
    return { storagePath: urlData.storagePath, contentType: 'image/jpeg' };
  };

  const runDefectAnalysis = async () => {
    setError(null);
    setAnalyzing('defect');
    try {
      const uploaded = await ensurePhotoUploaded();
      if (!uploaded) throw new Error('Selecciona o toma una foto primero.');

      const res = await fetch('/api/crm/field-inspections/analyze-defect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploaded)
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo analizar la foto.');

      const r = data.result;
      setValues(prev => ({
        ...prev,
        cantTotal: r.cantTotal,
        defecto: r.defecto,
        estado: r.estado,
        alertLevel: r.alertLevel,
        aiMetadata: r,
        observacion: prev.observacion.trim() ? `${prev.observacion.trim()}\n[IA Defectos]: ${r.observacion}` : `[IA Defectos]: ${r.observacion}`
      }));
      setIsLocked(r.isLocked);
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setAnalyzing(null);
    }
  };

  const runCountAnalysis = async () => {
    setError(null);
    setAnalyzing('count');
    try {
      const uploaded = await ensurePhotoUploaded();
      if (!uploaded) throw new Error('Selecciona o toma una foto primero.');

      const res = await fetch('/api/crm/field-inspections/count-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploaded)
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo contar el arrume.');

      const r = data.result;
      setDetectedUnits(r.unidades || []);
      setValues(prev => ({
        ...prev,
        cantTotal: r.cantTotal,
        observacion: prev.observacion.trim() ? `${prev.observacion.trim()}\n[IA Conteo]: ${r.observacion}` : `[IA Conteo]: ${r.observacion}`
      }));
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setAnalyzing(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setSaving(true);
    setError(null);
    try {
      const uploaded = await ensurePhotoUploaded().catch(() => null);
      await onSubmit({ ...values, photoStoragePath: uploaded?.storagePath || values.photoStoragePath });
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Fecha">
          <input type="date" value={values.fecha} onChange={e => set('fecha', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <ComboField label="Área de proceso" value={values.areaProceso} onChange={v => set('areaProceso', v)} options={AREAS_PROCESO} required listId="areas" />
        <Field label="Orden de Producción (OP)">
          <input type="text" value={values.op} onChange={e => set('op', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Plano / Ítems (ej: 1-5, 8)">
          <input type="text" value={values.planoOpc} onChange={e => set('planoOpc', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="1-5, 8, 10" />
        </Field>
        <ComboField label="Diseño / Serie" value={values.disenoReferencia} onChange={v => set('disenoReferencia', v)} options={DISENO_REFERENCIA_OPTIONS} listId="disenos" />
        <Field label="Cant. Total">
          <input type="number" value={values.cantTotal} onChange={e => set('cantTotal', Number(e.target.value) || 0)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Cant. Retenida">
          <input type="number" value={values.cantRetenida} onChange={e => set('cantRetenida', Number(e.target.value) || 0)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Estado SGC">
          <select value={values.estado} onChange={e => set('estado', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            {ESTADO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Defecto técnico">
          <select value={values.defecto} onChange={e => set('defecto', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            {DEFECTO_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <ComboField label="Revisó (inspector)" value={values.reviso} onChange={v => set('reviso', v)} options={REGISTRO_USERS} listId="revisores" />
        <ComboField label="Responsable (operario)" value={values.responsable} onChange={v => set('responsable', v)} options={OPERARIO_RESPONSABLES} listId="responsables" />
        <Field label="Acción correctiva">
          <select value={values.accionCorrectiva} onChange={e => set('accionCorrectiva', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            {ACCION_CORRECTIVA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      <ComboField label="Observación sugerida" value={values.observacionSugerida} onChange={v => set('observacionSugerida', v)} options={OBSERVACIONES_SUGERIDAS} listId="obs-sugeridas" />

      <div>
        <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
          Observación (dictamen final)
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`p-1.5 rounded-lg transition ${isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:text-[#003366]'}`}
              title={isListening ? 'Detener dictado' : 'Dictar por voz'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}
        </label>
        <textarea value={values.observacion} onChange={e => set('observacion', e.target.value)} rows={3} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="NA" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" /> Evidencia visual
        </label>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelected(e.target.files[0])} />
        {!photoPreviewUrl ? (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
            Tomar / elegir foto
          </button>
        ) : (
          <div className="space-y-2">
            <div className="relative w-full max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreviewUrl} alt="Evidencia" className="w-full rounded-xl border border-slate-200" />
              {detectedUnits.length > 0 && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {detectedUnits.map(u => {
                    const [ymin, xmin, ymax, xmax] = u.box2d;
                    return <rect key={u.id} x={xmin} y={ymin} width={xmax - xmin} height={ymax - ymin} fill="none" stroke="#22d3ee" strokeWidth={4} />;
                  })}
                </svg>
              )}
              <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreviewUrl(null); set('photoStoragePath', ''); setDetectedUnits([]); }} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={runDefectAnalysis} disabled={analyzing !== null} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50">
                {analyzing === 'defect' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Analizar defectos (IA)
              </button>
              <button type="button" onClick={runCountAnalysis} disabled={analyzing !== null} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50">
                {analyzing === 'count' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />} Contar arrume (IA)
              </button>
              <button type="button" onClick={() => setAiTool(aiTool === 'measure' ? 'none' : 'measure')} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50">
                <Ruler className="w-3.5 h-3.5" /> Medir en 2D
              </button>
            </div>

            {aiTool === 'measure' && <FieldInspectionMeasureTool imageUrl={photoPreviewUrl} />}
          </div>
        )}
      </div>

      {isLocked && (
        <p className="flex items-center gap-1.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2.5 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Defecto crítico detectado — corrige el defecto o el estado manualmente antes de poder guardar.
        </p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button type="submit" disabled={saving || isLocked} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition disabled:opacity-50">
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar inspección'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
          Cancelar
        </button>
      </div>
    </form>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-700 block mb-1">{label}</label>
    {children}
  </div>
);

const ComboField: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: string[]; listId: string; required?: boolean }> = ({
  label,
  value,
  onChange,
  options,
  listId,
  required
}) => (
  <Field label={label}>
    <input list={listId} value={value} onChange={e => onChange(e.target.value)} required={required} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
    <datalist id={listId}>
      {options.map(o => <option key={o} value={o} />)}
    </datalist>
  </Field>
);
