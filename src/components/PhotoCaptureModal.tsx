'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Loader2, AlertTriangle, ImagePlus, Check } from 'lucide-react';

const CAPTURE_MAX_WIDTH = 1600;
const CAPTURE_QUALITY = 0.9;

interface Props {
  /** Cuántas fotos más admite el grupo; al llegar a 0 la cámara se cierra sola. */
  remaining: number;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Alternativa cuando la cámara no está disponible: elegir archivos del dispositivo. */
  onUseFiles: () => void;
}

/**
 * Cámara para tomar las fotos del informe directamente desde el dispositivo
 * (cámara trasera en celular, webcam en PC). Permite capturar varias fotos
 * seguidas sin cerrar la vista; cada una se entrega por onCapture.
 */
export const PhotoCaptureModal: React.FC<Props> = ({ remaining, onCapture, onClose, onUseFiles }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
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
        setActive(true);
      } catch {
        if (!cancelled) setError('No se pudo acceder a la cámara. Revisa el permiso del navegador o usa "Subir archivo".');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    const scale = Math.min(1, CAPTURE_MAX_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      blob => {
        if (!blob) return;
        onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        const total = taken + 1;
        setTaken(total);
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        if (total >= remaining) onClose();
      },
      'image/jpeg',
      CAPTURE_QUALITY
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Camera className="w-4 h-4 text-[#003366]" /> Tomar foto</h4>
          <button type="button" onClick={onClose} aria-label="Cerrar cámara"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-slate-900">
          <video ref={videoRef} playsInline muted className="w-full aspect-video object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {flash && <div className="absolute inset-0 bg-white/80" />}
          {!active && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs gap-2 bg-slate-900/80">
              <Loader2 className="w-4 h-4 animate-spin" /> Activando cámara...
            </div>
          )}
          {taken > 0 && (
            <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <Check className="w-3 h-3" /> {taken} foto{taken === 1 ? '' : 's'} tomada{taken === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {error ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
            <button type="button" onClick={onUseFiles} className="w-full py-2 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1.5">
              <ImagePlus className="w-3.5 h-3.5" /> Subir archivo
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCapture} disabled={!active} className="flex-1 py-2.5 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Capturar
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl">
              {taken > 0 ? 'Listo' : 'Cancelar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
