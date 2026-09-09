'use client';

import React, { useState, useRef } from 'react';
import { Paperclip, AlertTriangle, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';

export interface MetrologyCalibrationFormValues {
  tool: string;
  code: string;
  lastDate: string;
  dueDate: string;
  status: 'Vigente' | 'Vencido' | 'Próximo' | 'Mantenimiento';
  certificateNumber: string;
  certificateStoragePath: string;
}

const EMPTY_FORM: MetrologyCalibrationFormValues = {
  tool: '',
  code: '',
  lastDate: '',
  dueDate: '',
  status: 'Vigente',
  certificateNumber: '',
  certificateStoragePath: ''
};

const MAX_CERTIFICATE_BYTES = 5 * 1024 * 1024;

async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return { error: `Respuesta inesperada del servidor (${res.status}).` };
  return res.json();
}

interface Props {
  initial?: Partial<MetrologyCalibrationFormValues>;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: (values: MetrologyCalibrationFormValues) => Promise<void>;
  apiBase?: string;
}

export const MetrologyCalibrationForm: React.FC<Props> = ({ initial, isEditing, onCancel, onSubmit, apiBase = '/api/crm/metrology-calibrations' }) => {
  const [values, setValues] = useState<MetrologyCalibrationFormValues>({ ...EMPTY_FORM, ...initial });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof MetrologyCalibrationFormValues>(key: K, value: MetrologyCalibrationFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const handleFileSelected = (file: File) => {
    setError(null);
    if (file.size > MAX_CERTIFICATE_BYTES) {
      setError('El certificado no debe superar los 5MB.');
      return;
    }
    setCertificateFile(file);
    set('certificateStoragePath', '');
  };

  const ensureCertificateUploaded = async (): Promise<string | undefined> => {
    if (values.certificateStoragePath) return values.certificateStoragePath;
    if (!certificateFile) return undefined;

    setUploading(true);
    try {
      const urlRes = await fetch(`${apiBase}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: certificateFile.name })
      });
      const urlData = await parseJsonResponse(urlRes);
      if (!urlRes.ok || !urlData.success) throw new Error(urlData.error || 'No se pudo iniciar la carga del certificado.');

      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error('Carga de certificados no disponible: falta configuración del servidor.');
      const { error: uploadErr } = await supabase.storage
        .from('metrology-calibration-certificates')
        .uploadToSignedUrl(urlData.storagePath, urlData.token, certificateFile, { contentType: certificateFile.type || 'application/octet-stream' });
      if (uploadErr) throw new Error(uploadErr.message);

      set('certificateStoragePath', urlData.storagePath);
      return urlData.storagePath;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const certificateStoragePath = await ensureCertificateUploaded().catch(err => {
        throw err;
      });
      await onSubmit({ ...values, certificateStoragePath: certificateStoragePath || values.certificateStoragePath });
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Nombre técnico del instrumento" className="sm:col-span-2">
          <input value={values.tool} onChange={e => set('tool', e.target.value)} required placeholder="Ej: Calibrador Digital Mitutoyo" className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Código interno">
          <input value={values.code} onChange={e => set('code', e.target.value)} required placeholder="Ej: MET-088" className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Última intervención">
          <input type="date" value={values.lastDate} onChange={e => set('lastDate', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Vencimiento del certificado">
          <input type="date" value={values.dueDate} onChange={e => set('dueDate', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Estado de vigencia">
          <select value={values.status} onChange={e => set('status', e.target.value as MetrologyCalibrationFormValues['status'])} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            <option value="Vigente">Vigente</option>
            <option value="Próximo">Próximo</option>
            <option value="Vencido">Vencido</option>
            <option value="Mantenimiento">Mantenimiento</option>
          </select>
        </Field>
      </div>

      <Field label="Número de certificado (opcional)">
        <input value={values.certificateNumber} onChange={e => set('certificateNumber', e.target.value)} placeholder="Ej: 88219" className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
      </Field>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Certificado adjunto (PDF o imagen, máx. 5MB)
        </label>
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />
        {certificateFile || values.certificateStoragePath ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
            <Paperclip className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate flex-1">{certificateFile?.name || 'Certificado ya adjuntado'}</span>
            <button type="button" onClick={() => { setCertificateFile(null); set('certificateStoragePath', ''); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
            Adjuntar certificado
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button type="submit" disabled={saving || uploading} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition disabled:opacity-50">
          {uploading ? 'Subiendo certificado...' : saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Incorporar al cronograma'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
          Cancelar
        </button>
      </div>
    </form>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={className}>
    <label className="text-[11px] font-bold text-slate-700 block mb-1">{label}</label>
    {children}
  </div>
);
