'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Ruler, Camera, FileImage, ImagePlus, RefreshCw, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Video, RotateCcw } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';
import { LiveMatrixCamera } from './LiveMatrixCamera';

async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { error: `Respuesta inesperada del servidor (${res.status}).` };
  }
  return res.json();
}

/**
 * Dos botones en vez de un solo <input type="file">: en móviles, un input
 * con capture="environment" a veces abre la cámara directo y salta la
 * opción de elegir de la galería (varía por navegador/Android vs iOS) —
 * separarlos garantiza ambas rutas sin depender de ese comportamiento.
 */
const PhotoPicker: React.FC<{
  label: string;
  icon: React.ReactNode;
  file: File | null;
  onSelect: (file: File | null) => void;
}> = ({ label, icon, file, onSelect }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
        {icon} {label}
      </label>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => onSelect(e.target.files?.[0] || null)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => onSelect(e.target.files?.[0] || null)}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition"
        >
          <Camera className="w-3.5 h-3.5" /> Tomar foto
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition"
        >
          <ImagePlus className="w-3.5 h-3.5" /> Elegir archivo
        </button>
        {file && <span className="text-[11px] text-emerald-700 font-semibold truncate max-w-[160px]">{file.name}</span>}
      </div>
    </div>
  );
};

interface AnalysisCota {
  label: string;
  nominalValueMm: number;
  tolerancePlusMm: number;
  toleranceMinusMm: number;
}

type ShapeCheckResult = 'coincide' | 'no_coincide' | 'no_concluyente';

interface AnalysisResult {
  sheet: {
    matrixCode: string | null;
    profileName: string | null;
    flatnessToleranceMm: number | null;
    eccentricityToleranceMm: number | null;
    cotas: AnalysisCota[];
  };
  shapeCheck: { result: ShapeCheckResult; notes: string };
}

const SHAPE_CHECK_LABEL: Record<string, string> = {
  coincide: 'La forma del perfil parece coincidir con la ficha',
  no_coincide: 'La forma del perfil NO parece coincidir con la ficha — verifica que sea la matriz correcta',
  no_concluyente: 'No se pudo comparar la forma con confianza (mejora el ángulo/luz de la foto)'
};

async function uploadToMatrixTemp(file: File): Promise<{ storagePath: string; contentType: string }> {
  const urlRes = await fetch('/api/matrix-analysis/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name })
  });
  const urlData = await parseJsonResponse(urlRes);
  if (!urlRes.ok || !urlData.success) throw new Error(urlData.error || 'No se pudo iniciar la carga de la foto.');

  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Carga de fotos no disponible: falta configuración del servidor.');
  const { error: uploadErr } = await supabase.storage
    .from('matrix-analysis-temp')
    .uploadToSignedUrl(urlData.storagePath, urlData.token, file, { contentType: file.type || 'image/jpeg' });
  if (uploadErr) throw new Error(uploadErr.message);

  return { storagePath: urlData.storagePath, contentType: file.type || 'image/jpeg' };
}

/**
 * Validación de Ficha de Matriz: analiza la foto del plano de extrusión
 * (cotas y tolerancias) y la foto del perfil físico (chequeo de FORMA
 * únicamente) en el momento — nada se guarda, ni el resultado ni las
 * fotos, que se borran del servidor apenas termina el análisis.
 *
 * La ficha se sube apenas se selecciona (no se espera a "Analizar") para
 * que la cámara en vivo del perfil pueda compararse contra ella cuadro a
 * cuadro mientras el inspector encuadra el corte transversal — ver
 * LiveMatrixCamera. Elegir una foto de galería sigue disponible como
 * alternativa si la cámara en vivo no está disponible en el dispositivo.
 *
 * No hay veredicto de conforme/no conforme por cota: eso requeriría la
 * medida real tomada con un calibrador, y esta herramienta no la pide.
 */
export const ProcessMatrixValidationPanel: React.FC<{ processSlug: string }> = ({ processSlug }) => {
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetUploading, setSheetUploading] = useState(false);
  const [sheetUploadError, setSheetUploadError] = useState<string | null>(null);
  const [sheetStoragePath, setSheetStoragePath] = useState<string | null>(null);
  const [sheetContentType, setSheetContentType] = useState<string | null>(null);

  const [profileMode, setProfileMode] = useState<'choose' | 'live-camera' | 'gallery'>('choose');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [liveStatusHint, setLiveStatusHint] = useState<{ result: ShapeCheckResult; notes: string } | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Cambiar esta clave fuerza a React a remontar los PhotoPicker al
  // reiniciar — así el input nativo también olvida el archivo anterior.
  const [resetCount, setResetCount] = useState(0);

  const sheetStoragePathRef = useRef<string | null>(null);
  useEffect(() => { sheetStoragePathRef.current = sheetStoragePath; }, [sheetStoragePath]);

  // Best-effort: si el inspector abandona el flujo con la ficha ya subida
  // pero sin terminar el análisis, no debe quedar el archivo huérfano en
  // Storage (el análisis final sí la borra explícitamente al terminar).
  useEffect(() => {
    return () => {
      const supabase = getSupabaseBrowserClient();
      if (supabase && sheetStoragePathRef.current) {
        supabase.storage.from('matrix-analysis-temp').remove([sheetStoragePathRef.current]).catch(() => {});
      }
    };
  }, []);

  // Subir la ficha apenas se selecciona, para que la cámara en vivo pueda
  // usarla de referencia sin esperar al botón "Analizar".
  useEffect(() => {
    if (!sheetFile) return;
    let cancelled = false;
    setSheetUploading(true);
    setSheetUploadError(null);
    setSheetStoragePath(null);
    uploadToMatrixTemp(sheetFile)
      .then(({ storagePath, contentType }) => {
        if (cancelled) return;
        setSheetStoragePath(storagePath);
        setSheetContentType(contentType);
      })
      .catch(err => {
        if (!cancelled) setSheetUploadError(err?.message || 'No se pudo subir la foto de la ficha.');
      })
      .finally(() => {
        if (!cancelled) setSheetUploading(false);
      });
    return () => { cancelled = true; };
  }, [sheetFile]);

  const handleAnalyze = async () => {
    if (!sheetStoragePath || !sheetContentType || !profileFile) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const profileUpload = await uploadToMatrixTemp(profileFile);

      const res = await fetch('/api/matrix-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetStoragePath,
          sheetContentType,
          profileStoragePath: profileUpload.storagePath,
          profileContentType: profileUpload.contentType
        })
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo analizar las fotos.');

      // El análisis final ya borró también la ficha en el servidor.
      setSheetStoragePath(null);
      setResult({ sheet: data.sheet, shapeCheck: data.shapeCheck });
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAll = () => {
    setSheetFile(null);
    setSheetUploading(false);
    setSheetUploadError(null);
    setSheetStoragePath(null);
    setSheetContentType(null);
    setProfileMode('choose');
    setProfileFile(null);
    setLiveStatusHint(null);
    setResult(null);
    setError(null);
    setResetCount(n => n + 1);
  };

  const changeProfilePhoto = () => {
    setProfileFile(null);
    setLiveStatusHint(null);
    setProfileMode('choose');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Ruler className="w-5 h-5 text-[#003366]" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Validación de Ficha de Matriz</h3>
          <p className="text-[11px] text-slate-500">
            Sube la foto del plano de extrusión y encuadra el perfil con la cámara en vivo — nada se guarda, es un análisis puntual.
          </p>
        </div>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
            result.shapeCheck.result === 'coincide'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : result.shapeCheck.result === 'no_coincide'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {result.shapeCheck.result === 'coincide' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : result.shapeCheck.result === 'no_coincide' ? (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{SHAPE_CHECK_LABEL[result.shapeCheck.result]}</p>
              {result.shapeCheck.notes && <p className="mt-0.5 opacity-80">{result.shapeCheck.notes}</p>}
              <p className="mt-1 opacity-60 italic">Chequeo de forma únicamente — no mide cotas.</p>
            </div>
          </div>

          {(result.sheet.flatnessToleranceMm !== null || result.sheet.eccentricityToleranceMm !== null) && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              {result.sheet.flatnessToleranceMm !== null && (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                  Tolerancia de planeidad: ±{result.sheet.flatnessToleranceMm} mm
                </span>
              )}
              {result.sheet.eccentricityToleranceMm !== null && (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                  Tolerancia de excentricidad: {result.sheet.eccentricityToleranceMm} mm
                </span>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-1.5 pr-2">Cota (ficha)</th>
                  <th className="py-1.5 pr-2">Nominal</th>
                  <th className="py-1.5">Tolerancia</th>
                </tr>
              </thead>
              <tbody>
                {result.sheet.cotas.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-slate-400 text-center">No se detectaron cotas en la imagen.</td></tr>
                ) : (
                  result.sheet.cotas.map((c, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-1.5 pr-2 font-medium text-slate-700">{c.label}</td>
                      <td className="py-1.5 pr-2 text-slate-500">{c.nominalValueMm} mm</td>
                      <td className="py-1.5 text-slate-500">+{c.tolerancePlusMm} / -{c.toleranceMinusMm} mm</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Estas cotas y tolerancias son las impresas en la ficha — compáralas contra tu medición real con calibrador para determinar conformidad.
          </p>

          <button onClick={resetAll} className="w-full py-2 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition">
            Analizar otra ficha
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <PhotoPicker
              key={`sheet-${resetCount}`}
              label="1. Foto de la ficha de matriz (plano con cotas)"
              icon={<FileImage className="w-3.5 h-3.5" />}
              file={sheetFile}
              onSelect={setSheetFile}
            />
            {sheetUploading && (
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <RefreshCw className="w-3 h-3 animate-spin" /> Subiendo ficha para el chequeo en vivo...
              </p>
            )}
            {sheetUploadError && (
              <p className="flex items-center gap-1.5 text-[11px] text-rose-700">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {sheetUploadError}
              </p>
            )}
          </div>

          {sheetStoragePath && sheetContentType && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> 2. Corte transversal del perfil
              </label>

              {profileFile ? (
                <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-xs font-semibold text-emerald-800 truncate">
                    ✓ Foto lista{liveStatusHint ? ` — vista previa en vivo: ${SHAPE_CHECK_LABEL[liveStatusHint.result]}` : ''}
                  </span>
                  <button onClick={changeProfilePhoto} className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition shrink-0" title="Cambiar foto">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : profileMode === 'live-camera' ? (
                <LiveMatrixCamera
                  sheetStoragePath={sheetStoragePath}
                  sheetContentType={sheetContentType}
                  onCaptured={(file, status) => {
                    setProfileFile(file);
                    setLiveStatusHint(status);
                  }}
                  onCancel={() => setProfileMode('choose')}
                  onUseGalleryInstead={() => setProfileMode('gallery')}
                />
              ) : profileMode === 'gallery' ? (
                <PhotoPicker
                  key={`profile-${resetCount}`}
                  label="Elige la foto del corte transversal"
                  icon={<Camera className="w-3.5 h-3.5" />}
                  file={profileFile}
                  onSelect={setProfileFile}
                />
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setProfileMode('live-camera')}
                    className="w-full py-2.5 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Iniciar cámara en vivo
                  </button>
                  <button
                    onClick={() => setProfileMode('gallery')}
                    className="w-full py-2 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> Elegir foto desde galería
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}

          {profileFile && (
            <button
              onClick={handleAnalyze}
              disabled={!sheetStoragePath || !profileFile || analyzing}
              className="w-full py-2.5 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
              {analyzing ? 'Analizando...' : 'Analizar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
