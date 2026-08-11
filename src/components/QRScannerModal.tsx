import React, { useState } from 'react';
import { ProcessItem } from '../types';
import { X, QrCode, Camera, Upload, CheckCircle2, ArrowRight } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  processes: ProcessItem[];
  onSelectProcess: (slug: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  processes,
  onSelectProcess
}) => {
  const [selectedProcessSlug, setSelectedProcessSlug] = useState<string>(processes[0]?.slug || 'corte-perfileria');
  const [simulatedScanSuccess, setSimulatedScanSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setSimulatedScanSuccess(true);
    setTimeout(() => {
      onSelectProcess(selectedProcessSlug);
      setSimulatedScanSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Escanear Código QR de Proceso</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor Simulado de Cámara de Planta */}
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-square flex flex-col items-center justify-center p-6 text-center text-white border-2 border-dashed border-blue-500/50">
          <div className="absolute inset-8 border-2 border-blue-400 rounded-xl pointer-events-none animate-pulse" />
          
          {simulatedScanSuccess ? (
            <div className="space-y-2 text-emerald-400 animate-in zoom-in duration-200">
              <CheckCircle2 className="w-12 h-12 mx-auto" />
              <p className="font-bold text-sm">¡Código QR Identificado!</p>
              <p className="text-xs text-slate-300">Abriendo proceso de Calidad Alco...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Camera className="w-10 h-10 text-blue-400 mx-auto animate-bounce" />
              <p className="text-xs text-slate-300 font-medium">
                Apunta la cámara del celular al código QR pegado en la estación de trabajo
              </p>
            </div>
          )}
        </div>

        {/* Selector Manual / Simulación de Escaneo */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Seleccionar Código QR de Prueba en Planta:
          </label>
          <select
            value={selectedProcessSlug}
            onChange={(e) => setSelectedProcessSlug(e.target.value)}
            className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {processes.map((proc) => (
              <option key={proc.id} value={proc.slug}>
                {proc.code} — {proc.name} ({proc.department})
              </option>
            ))}
          </select>

          <button
            onClick={handleSimulateScan}
            id="simulate-scan-submit-btn"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all"
          >
            Escanear QR Selección
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
