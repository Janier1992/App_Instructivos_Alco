'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Ruler, Trash2, Check, X, Pencil, Plus, AlertTriangle, EyeOff, Send } from 'lucide-react';
import { ProcessPicker } from './ProcessPicker';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';

async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { error: `Respuesta inesperada del servidor (${res.status}).` };
  }
  return res.json();
}

interface Cota {
  id: string;
  label: string;
  nominalValueMm: number;
  tolerancePlusMm: number;
  toleranceMinusMm: number;
  displayOrder: number;
}

interface MatrixSheet {
  id: string;
  processSlug: string;
  matrixCode: string;
  profileName: string;
  flatnessToleranceMm: number | null;
  eccentricityToleranceMm: number | null;
  status: 'draft' | 'published';
  cotas: Cota[];
}

/**
 * Biblioteca de fichas de matriz para Validación en planta: Calidad sube
 * la foto del plano una vez por matriz, el sistema extrae las cotas y
 * tolerancias por visión, y aquí se revisan/corrigen antes de publicar —
 * solo entonces aparece en el selector de inspección de la app pública.
 */
export const CrmMatrixSheetsManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [sheets, setSheets] = useState<MatrixSheet[]>([]);
  const [loading, setLoading] = useState(false);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [matrixCode, setMatrixCode] = useState('');
  const [profileName, setProfileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<MatrixSheet | null>(null);
  const [editCotas, setEditCotas] = useState<Cota[]>([]);
  const [editFlatness, setEditFlatness] = useState<string>('');
  const [editEccentricity, setEditEccentricity] = useState<string>('');
  const [saving, setSaving] = useState<'save' | 'publish' | 'unpublish' | null>(null);

  const load = useCallback(async () => {
    if (!processSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/matrix-sheets?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setSheets(data.sheets || []);
    } catch (err) {
      console.error('Error cargando fichas de matriz:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!matrixCode.trim() || !profileName.trim() || !file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const urlRes = await fetch('/api/crm/matrix-sheets/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name })
      });
      const urlData = await parseJsonResponse(urlRes);
      if (!urlRes.ok || !urlData.success) {
        throw new Error(urlData.error || 'No se pudo iniciar la carga de la imagen.');
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error('Falta configuración del servidor (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).');
      const { error: uploadErr } = await supabase.storage
        .from('matrix-sheets-source')
        .uploadToSignedUrl(urlData.storagePath, urlData.token, file, { contentType: file.type || 'image/jpeg' });
      if (uploadErr) throw new Error(uploadErr.message);

      const res = await fetch('/api/crm/matrix-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          matrixCode,
          profileName,
          storagePath: urlData.storagePath,
          contentType: file.type || 'image/jpeg'
        })
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) {
        setMatrixCode('');
        setProfileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUploadForm(false);
        await load();
        openEditor(data.sheet);
      } else {
        setUploadError(data.error || 'No se pudo procesar la ficha.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error de conexión.');
    } finally {
      setUploading(false);
    }
  };

  const openEditor = (sheet: MatrixSheet) => {
    setEditing(sheet);
    setEditCotas(sheet.cotas.length > 0 ? sheet.cotas : []);
    setEditFlatness(sheet.flatnessToleranceMm !== null ? String(sheet.flatnessToleranceMm) : '');
    setEditEccentricity(sheet.eccentricityToleranceMm !== null ? String(sheet.eccentricityToleranceMm) : '');
  };

  const updateCota = (idx: number, patch: Partial<Cota>) => {
    setEditCotas(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addCota = () => {
    setEditCotas(prev => [
      ...prev,
      { id: `new-${Date.now()}`, label: '', nominalValueMm: 0, tolerancePlusMm: 0, toleranceMinusMm: 0, displayOrder: prev.length }
    ]);
  };

  const removeCota = (idx: number) => {
    setEditCotas(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (action: 'save' | 'publish' | 'unpublish') => {
    if (!editing) return;
    setSaving(action);
    try {
      const body: Record<string, unknown> = {
        cotas: editCotas
          .filter(c => c.label.trim())
          .map(c => ({ label: c.label.trim(), nominalValueMm: c.nominalValueMm, tolerancePlusMm: c.tolerancePlusMm, toleranceMinusMm: c.toleranceMinusMm })),
        flatnessToleranceMm: editFlatness.trim() ? Number(editFlatness) : null,
        eccentricityToleranceMm: editEccentricity.trim() ? Number(editEccentricity) : null
      };
      if (action === 'publish') body.publish = true;
      if (action === 'unpublish') body.unpublish = true;

      const res = await fetch(`/api/crm/matrix-sheets/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) {
        setEditing(null);
        await load();
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error guardando ficha:', err);
      alert('Error de conexión.');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta ficha de matriz definitivamente? Las inspecciones ya registradas con ella se conservan.')) return;
    try {
      const res = await fetch(`/api/crm/matrix-sheets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (editing?.id === id) setEditing(null);
        await load();
      } else {
        alert(data.error || 'No se pudo eliminar.');
      }
    } catch (err) {
      console.error('Error eliminando ficha:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Fichas de Matriz</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Sube la foto del plano de extrusión — el sistema extrae las cotas y tolerancias, revísalas y publica para que estén disponibles en la Validación de Ficha de Matriz en planta.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <ProcessPicker value={processSlug} onChange={setProcessSlug} />
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:text-blue-900 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
            {processSlug && (
              <button
                onClick={() => setShowUploadForm(v => !v)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Ficha
              </button>
            )}
          </div>
        </div>

        {showUploadForm && (
          <form onSubmit={handleUpload} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <input
              type="text"
              value={matrixCode}
              onChange={e => setMatrixCode(e.target.value)}
              placeholder="Código de matriz (ej. M-1234)"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
            <input
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Nombre del perfil"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#003366] file:text-white file:text-xs file:font-bold"
            />
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> Extrayendo cotas de la ficha...
              </div>
            )}
            {uploadError && (
              <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {uploadError}
              </p>
            )}
            <button
              type="submit"
              disabled={uploading || !matrixCode.trim() || !profileName.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
            >
              {uploading ? 'Procesando...' : 'Extraer cotas y crear borrador'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-xs text-slate-400">Cargando...</p>
        ) : sheets.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {processSlug ? 'Sin fichas de matriz para este proceso.' : 'Selecciona un proceso.'}
          </p>
        ) : (
          <div className="space-y-2">
            {sheets.map(sheet => (
              <div key={sheet.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{sheet.matrixCode}</span>
                    <span className="text-xs text-slate-500 truncate">{sheet.profileName}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                      sheet.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {sheet.status === 'published' ? 'Publicada' : 'Borrador'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sheet.cotas.length} cotas registradas</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEditor(sheet)} title="Editar" className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(sheet.id)} title="Eliminar" className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#003366]" /> {editing.matrixCode} — {editing.profileName}
              </h3>
              <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tolerancia de planeidad (mm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFlatness}
                  onChange={e => setEditFlatness(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tolerancia de excentricidad (mm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editEccentricity}
                  onChange={e => setEditEccentricity(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Cotas ({editCotas.length})</label>
                <button onClick={addCota} className="text-[11px] font-semibold text-[#003366] flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar cota
                </button>
              </div>
              {editCotas.map((cota, idx) => (
                <div key={cota.id} className="grid grid-cols-12 gap-1.5 items-center">
                  <input
                    value={cota.label}
                    onChange={e => updateCota(idx, { label: e.target.value })}
                    placeholder="Descripción"
                    className="col-span-5 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={cota.nominalValueMm}
                    onChange={e => updateCota(idx, { nominalValueMm: Number(e.target.value) })}
                    placeholder="Nominal"
                    className="col-span-2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={cota.tolerancePlusMm}
                    onChange={e => updateCota(idx, { tolerancePlusMm: Number(e.target.value) })}
                    placeholder="Tol +"
                    className="col-span-2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={cota.toleranceMinusMm}
                    onChange={e => updateCota(idx, { toleranceMinusMm: Number(e.target.value) })}
                    placeholder="Tol -"
                    className="col-span-2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <button onClick={() => removeCota(idx)} className="col-span-1 text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleSave('save')}
                disabled={saving !== null}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Guardar borrador
              </button>
              {editing.status === 'published' ? (
                <button
                  onClick={() => handleSave('unpublish')}
                  disabled={saving !== null}
                  className="px-3 py-2 text-xs font-bold text-white bg-slate-500 hover:bg-slate-600 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Despublicar
                </button>
              ) : (
                <button
                  onClick={() => handleSave('publish')}
                  disabled={saving !== null || editCotas.length === 0}
                  className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Publicar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
