'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Ruler, Camera, RefreshCw, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Gauge } from 'lucide-react';
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
}

interface MatrixSheet {
  id: string;
  matrixCode: string;
  profileName: string;
  flatnessToleranceMm: number | null;
  eccentricityToleranceMm: number | null;
  cotas: Cota[];
}

interface MeasurementDraft {
  value: string;
  photoStoragePath?: string;
  reading: boolean;
}

interface InspectionResult {
  overallResult: 'conforme' | 'no_conforme';
  shapeCheckResult: 'coincide' | 'no_coincide' | 'no_concluyente' | null;
  shapeCheckNotes: string | null;
  measurements: { cotaLabel: string; nominalValueMm: number; measuredValueMm: number; deviationMm: number; withinTolerance: boolean }[];
}

const SHAPE_CHECK_LABEL: Record<string, string> = {
  coincide: 'La forma del perfil parece coincidir con la ficha',
  no_coincide: 'La forma del perfil NO parece coincidir con la ficha — verifica que sea la matriz correcta',
  no_concluyente: 'No se pudo comparar la forma con confianza (mejora el ángulo/luz de la foto)'
};

/**
 * Validación de Ficha de Matriz: compara la materia prima (perfil de
 * aluminio) contra el plano de extrusión. El chequeo de FORMA es solo
 * visual (identidad del perfil) — la conformidad de cada cota siempre se
 * calcula con el valor que el inspector mide con su calibrador, nunca con
 * una estimación de la foto del perfil (esa foto no tiene referencia de
 * escala, así que cualquier medida "leída" de ella sería inventada).
 */
export const ProcessMatrixValidationPanel: React.FC<{ processSlug: string }> = ({ processSlug }) => {
  const [sheets, setSheets] = useState<MatrixSheet[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(true);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, MeasurementDraft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const caliperInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`/api/matrix-sheets?processSlug=${encodeURIComponent(processSlug)}`)
      .then(res => res.json())
      .then(data => setSheets(data.sheets || []))
      .catch(err => console.error('Error cargando fichas de matriz:', err))
      .finally(() => setLoadingSheets(false));
  }, [processSlug]);

  const selectedSheet = sheets.find(s => s.id === selectedSheetId) || null;

  const resetForm = useCallback(() => {
    setInspectorName('');
    setProfileFile(null);
    setMeasurements({});
    if (profileInputRef.current) profileInputRef.current.value = '';
  }, []);

  const uploadToInspectionBucket = async (file: File): Promise<{ storagePath: string; contentType: string }> => {
    const urlRes = await fetch('/api/matrix-inspections/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name })
    });
    const urlData = await parseJsonResponse(urlRes);
    if (!urlRes.ok || !urlData.success) throw new Error(urlData.error || 'No se pudo iniciar la carga de la foto.');

    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error('Carga de fotos no disponible: falta configuración del servidor.');
    const { error: uploadErr } = await supabase.storage
      .from('matrix-inspection-photos')
      .uploadToSignedUrl(urlData.storagePath, urlData.token, file, { contentType: file.type || 'image/jpeg' });
    if (uploadErr) throw new Error(uploadErr.message);

    return { storagePath: urlData.storagePath, contentType: file.type || 'image/jpeg' };
  };

  const handleCaliperPhoto = async (cotaId: string, file: File) => {
    setMeasurements(prev => ({ ...prev, [cotaId]: { ...(prev[cotaId] || { value: '' }), reading: true } }));
    try {
      const { storagePath, contentType } = await uploadToInspectionBucket(file);
      const res = await fetch('/api/matrix-inspections/read-caliper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, contentType })
      });
      const data = await parseJsonResponse(res);
      setMeasurements(prev => ({
        ...prev,
        [cotaId]: {
          value: data.value !== null && data.value !== undefined ? String(data.value) : prev[cotaId]?.value || '',
          photoStoragePath: storagePath,
          reading: false
        }
      }));
    } catch (err: any) {
      setMeasurements(prev => ({ ...prev, [cotaId]: { ...(prev[cotaId] || { value: '' }), reading: false } }));
      alert(err?.message || 'No se pudo leer la foto del calibrador — digita el valor manualmente.');
    }
  };

  const allMeasured = selectedSheet ? selectedSheet.cotas.every(c => measurements[c.id]?.value.trim()) : false;
  const canSubmit = selectedSheet && inspectorName.trim() && profileFile && allMeasured && !submitting;

  const handleSubmit = async () => {
    if (!selectedSheet || !profileFile) return;
    setSubmitting(true);
    setError(null);
    try {
      const { storagePath: profileStoragePath, contentType: profileContentType } = await uploadToInspectionBucket(profileFile);

      const res = await fetch('/api/matrix-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: selectedSheet.id,
          inspectorName,
          profileStoragePath,
          profileContentType,
          measurements: selectedSheet.cotas.map(c => ({
            cotaId: c.id,
            measuredValueMm: Number(measurements[c.id]?.value),
            measurementPhotoStoragePath: measurements[c.id]?.photoStoragePath
          }))
        })
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo registrar la inspección.');
      }

      setResult({
        overallResult: data.inspection.overallResult,
        shapeCheckResult: data.inspection.shapeCheckResult,
        shapeCheckNotes: data.inspection.shapeCheckNotes,
        measurements: data.inspection.measurements.map((m: any) => ({
          cotaLabel: m.cotaLabel,
          nominalValueMm: m.nominalValueMm,
          measuredValueMm: m.measuredValueMm,
          deviationMm: m.deviationMm,
          withinTolerance: m.withinTolerance
        }))
      });
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSheets) return null;
  if (sheets.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Ruler className="w-5 h-5 text-[#003366]" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Validación de Ficha de Matriz</h3>
          <p className="text-[11px] text-slate-500">Compara la materia prima recibida contra el plano de extrusión.</p>
        </div>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-sm ${
            result.overallResult === 'conforme' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {result.overallResult === 'conforme' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            {result.overallResult === 'conforme' ? 'Conforme — dentro de tolerancia' : 'No conforme — hay al menos una cota fuera de tolerancia'}
          </div>

          {result.shapeCheckResult && (
            <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
              result.shapeCheckResult === 'coincide' ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {result.shapeCheckResult === 'no_concluyente' ? <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{SHAPE_CHECK_LABEL[result.shapeCheckResult]}</p>
                {result.shapeCheckNotes && <p className="mt-0.5 opacity-80">{result.shapeCheckNotes}</p>}
                <p className="mt-0.5 opacity-60 italic">Chequeo de forma únicamente — no mide cotas.</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-1.5 pr-2">Cota</th>
                  <th className="py-1.5 pr-2">Nominal</th>
                  <th className="py-1.5 pr-2">Medido</th>
                  <th className="py-1.5 pr-2">Desviación</th>
                  <th className="py-1.5">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {result.measurements.map((m, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-1.5 pr-2 font-medium text-slate-700">{m.cotaLabel}</td>
                    <td className="py-1.5 pr-2 text-slate-500">{m.nominalValueMm} mm</td>
                    <td className="py-1.5 pr-2 text-slate-500">{m.measuredValueMm} mm</td>
                    <td className="py-1.5 pr-2 text-slate-500">{m.deviationMm > 0 ? '+' : ''}{m.deviationMm.toFixed(3)} mm</td>
                    <td className="py-1.5">
                      {m.withinTolerance ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span>
                      ) : (
                        <span className="text-rose-700 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Fuera</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setResult(null)}
            className="w-full py-2 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            Registrar otra inspección
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <select
            value={selectedSheetId}
            onChange={e => setSelectedSheetId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          >
            <option value="">Selecciona la matriz a validar...</option>
            {sheets.map(s => (
              <option key={s.id} value={s.id}>{s.matrixCode} — {s.profileName}</option>
            ))}
          </select>

          {selectedSheet && (
            <>
              <input
                type="text"
                value={inspectorName}
                onChange={e => setInspectorName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Camera className="w-3.5 h-3.5" /> Foto del corte transversal del perfil
                </label>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => setProfileFile(e.target.files?.[0] || null)}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#003366] file:text-white file:text-xs file:font-bold"
                />
              </div>

              <div className="space-y-2">
                {selectedSheet.cotas.map(cota => {
                  const draft = measurements[cota.id];
                  return (
                    <div key={cota.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs font-bold text-slate-700">
                        {cota.label} <span className="font-normal text-slate-400">({cota.nominalValueMm} mm, +{cota.tolerancePlusMm}/-{cota.toleranceMinusMm})</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="number"
                          step="0.001"
                          value={draft?.value || ''}
                          onChange={e => setMeasurements(prev => ({ ...prev, [cota.id]: { ...(prev[cota.id] || { reading: false }), value: e.target.value } }))}
                          placeholder="Valor medido (mm)"
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                        <input
                          ref={el => { caliperInputRefs.current[cota.id] = el; }}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleCaliperPhoto(cota.id, file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => caliperInputRefs.current[cota.id]?.click()}
                          disabled={draft?.reading}
                          title="Foto de la pantalla del calibrador"
                          className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                        >
                          {draft?.reading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5 text-[#003366]" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-2.5 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
                {submitting ? 'Registrando...' : 'Registrar inspección'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
