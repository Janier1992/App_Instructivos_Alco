'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, CheckCircle2, XCircle, HelpCircle, Loader2, AlertTriangle, ImagePlus } from 'lucide-react';

async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return { error: `Respuesta inesperada del servidor (${res.status}).` };
  return res.json();
}

type ShapeCheckResult = 'coincide' | 'no_coincide' | 'no_concluyente';

const LIVE_CHECK_INTERVAL_MS = 2500;
const LIVE_FRAME_MAX_WIDTH = 800;
const CAPTURE_MAX_WIDTH = 1600;

const STATUS_STYLES: Record<'buscando' | ShapeCheckResult, { ring: string; badge: string; icon: React.ReactNode; label: string }> = {
  buscando: {
    ring: 'ring-slate-300',
    badge: 'bg-slate-800/80 text-white',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: 'Buscando el corte transversal del perfil...'
  },
  coincide: {
    ring: 'ring-emerald-400',
    badge: 'bg-emerald-600/90 text-white',
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: '¡Coincide con la ficha! Puedes capturar.'
  },
  no_coincide: {
    ring: 'ring-rose-500',
    badge: 'bg-rose-600/90 text-white',
    icon: <XCircle className="w-4 h-4" />,
    label: 'No coincide — verifica que sea la matriz correcta.'
  },
  no_concluyente: {
    ring: 'ring-amber-400',
    badge: 'bg-amber-500/90 text-white',
    icon: <HelpCircle className="w-4 h-4" />,
    label: 'No se pudo comparar con confianza — ajusta ángulo/luz.'
  }
};

function captureFrameAsDataUrl(video: HTMLVideoElement, canvas: HTMLCanvasElement, maxWidth: number, quality: number): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [, base64] = dataUrl.split(',');
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], fileName, { type: 'image/jpeg' });
}

interface Props {
  sheetStoragePath: string;
  sheetContentType: string;
  onCaptured: (file: File, lastStatus: { result: ShapeCheckResult; notes: string } | null) => void;
  onCancel: () => void;
  onUseGalleryInstead: () => void;
}

/**
 * Cámara en vivo para la Validación de Ficha de Matriz: mientras el
 * inspector encuadra el corte transversal del perfil, envía cuadros de la
 * cámara al chequeo de forma (ver /api/matrix-analysis/live-check) cada
 * ~2.5 s y muestra en vivo si ya coincide con la ficha ya cargada — el
 * inspector sigue capturando manualmente (esto es una guía, no un
 * veredicto automático), pero ya sabe de antemano si el encuadre sirve.
 */
export const LiveMatrixCamera: React.FC<Props> = ({ sheetStoragePath, sheetContentType, onCaptured, onCancel, onUseGalleryInstead }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const checkingRef = useRef(false);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<{ result: ShapeCheckResult; notes: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStreamActive(true);
      } catch {
        if (!cancelled) setCameraError('No se pudo acceder a la cámara (permiso denegado o no disponible en este dispositivo).');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  const runLiveCheck = useCallback(async () => {
    if (checkingRef.current || !videoRef.current || !canvasRef.current) return;
    const dataUrl = captureFrameAsDataUrl(videoRef.current, canvasRef.current, LIVE_FRAME_MAX_WIDTH, 0.7);
    if (!dataUrl) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const res = await fetch('/api/matrix-analysis/live-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameBase64: dataUrl.split(',')[1], sheetStoragePath, sheetContentType })
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) setLiveStatus(data.shapeCheck);
    } catch {
      // Falla silenciosa de un cuadro puntual — el siguiente intervalo reintenta.
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [sheetStoragePath, sheetContentType]);

  useEffect(() => {
    if (!streamActive) return;
    const interval = setInterval(runLiveCheck, LIVE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [streamActive, runLiveCheck]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const dataUrl = captureFrameAsDataUrl(videoRef.current, canvasRef.current, CAPTURE_MAX_WIDTH, 0.9);
    if (!dataUrl) return;
    const file = dataUrlToFile(dataUrl, `perfil-corte-${Date.now()}.jpg`);
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCaptured(file, liveStatus);
  };

  const statusKey: 'buscando' | ShapeCheckResult = liveStatus?.result || 'buscando';
  const style = STATUS_STYLES[statusKey];

  return (
    <div className="space-y-3">
      <div className={`relative rounded-xl overflow-hidden bg-slate-900 ring-4 transition-all ${style.ring}`}>
        <video ref={videoRef} playsInline muted className="w-full aspect-video object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {!streamActive && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs gap-2 bg-slate-900/80">
            <Loader2 className="w-4 h-4 animate-spin" /> Activando cámara...
          </div>
        )}

        {/* Guía de encuadre */}
        {streamActive && (
          <div className="absolute inset-6 border-2 border-dashed border-white/50 rounded-lg pointer-events-none" />
        )}

        {streamActive && (
          <div className={`absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${style.badge}`}>
            {style.icon}
            <span className="flex-1">{style.label}</span>
            {checking && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
          </div>
        )}
      </div>

      {cameraError ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {cameraError}
          </p>
          <button
            onClick={onUseGalleryInstead}
            className="w-full py-2 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <ImagePlus className="w-3.5 h-3.5" /> Elegir foto desde galería
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleCapture}
            disabled={!streamActive}
            className={`flex-1 py-2.5 font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-2 ${
              liveStatus?.result === 'coincide' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#003366] hover:bg-blue-900 text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> Capturar
          </button>
          <button
            onClick={onCancel}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="Cancelar cámara en vivo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-400 italic">
        Guía en vivo — el chequeo de forma se repite cada ~2.5 s mientras encuadras. Tú decides cuándo capturar; el veredicto final se confirma al analizar.
      </p>
    </div>
  );
};
