'use client';

import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  label: string;
  initialValue?: string | null;
  onChange: (dataUrl: string) => void;
  accentClassName?: string;
}

/**
 * Firma digital sobre canvas — trazo suavizado (curva cuadrática) con
 * grosor sensible a la presión del lápiz/dedo cuando el dispositivo lo
 * reporta. Portado del proyecto de referencia (Metrología Pro).
 */
export const SignaturePad: React.FC<Props> = ({ label, initialValue, onChange, accentClassName = 'border-sky-200' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!initialValue) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = initialValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] > 0) return false;
    }
    return true;
  };

  const emitChange = () => {
    const canvas = canvasRef.current;
    if (!canvas || isCanvasBlank(canvas)) {
      onChange('');
      return;
    }
    onChange(canvas.toDataURL('image/png'));
  };

  const getCoordinates = (e: React.PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#020617';
    ctx.shadowColor = 'rgba(2, 6, 23, 0.15)';
    ctx.shadowBlur = 1.5;
    lastPoint.current = { x, y };
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || !lastPoint.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const { x, y } = getCoordinates(e, canvas);
    const last = lastPoint.current;
    const midX = (last.x + x) / 2;
    const midY = (last.y + y) / 2;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.quadraticCurveTo(last.x, last.y, midX, midY);
    ctx.lineWidth = e.pressure > 0 ? 3.5 + e.pressure * 2.5 : 3.5;
    ctx.stroke();
    lastPoint.current = { x, y };
  };

  const stopDrawing = () => {
    if (isDrawing) emitChange();
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastPoint.current = null;
    onChange('');
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-700 block">{label}</label>
      <div className={`relative rounded-2xl overflow-hidden border-2 ${accentClassName} bg-gradient-to-b from-slate-50 to-white`} style={{ height: 160 }}>
        <div className="absolute bottom-8 left-6 right-6 border-b-2 border-dashed border-slate-200 z-10 pointer-events-none" />
        <p className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] pointer-events-none z-10">Firme aquí</p>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
        />
        <button type="button" onClick={clear} className="absolute top-2 right-2 z-20 p-1.5 bg-white/80 border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 shadow-sm transition" title="Limpiar firma">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
