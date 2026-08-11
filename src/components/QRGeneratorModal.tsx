import React, { useState, useEffect } from 'react';
import { ProcessItem } from '../types';
import { generateProcessQRSVG, buildProcessUrl } from '../lib/qrService';
import { X, QrCode, Download, Printer, Copy, Check, Globe } from 'lucide-react';

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: ProcessItem | null;
}

export const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({
  isOpen,
  onClose,
  process
}) => {
  const [customDomain, setCustomDomain] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCustomDomain(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (process && isOpen) {
      generateProcessQRSVG(process.slug, { domain: customDomain || undefined })
        .then(svg => setQrSvg(svg))
        .catch(err => console.error('Error generando SVG:', err));
    }
  }, [process, customDomain, isOpen]);

  if (!isOpen || !process) return null;

  const targetUrl = buildProcessUrl(process.slug, customDomain || undefined);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-Alco-${process.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imprimir QR — Calidad Alco ${process.name}</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 40px; }
              .card { border: 2px solid #0f172a; border-radius: 16px; padding: 30px; display: inline-block; }
              h1 { font-size: 24px; color: #0f172a; margin: 0; }
              h2 { font-size: 16px; color: #2563eb; margin: 5px 0 20px 0; }
              .qr { width: 250px; height: 250px; margin: 0 auto; }
              .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>ALCO S.A.S.</h1>
              <h2>PROCESO DE CALIDAD: ${process.name.toUpperCase()}</h2>
              <div class="qr">${qrSvg}</div>
              <p><strong>CÓDIGO:</strong> ${process.code} | <strong>VERSIÓN:</strong> ${process.activeVersion}</p>
              <div class="footer">Escanear para acceder a la Infografía y Asistente IA Oficial</div>
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Código QR de Proceso — {process.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Muestra de QR */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div 
            className="bg-white p-4 rounded-xl shadow-md border border-slate-200 w-56 h-56 flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div>
            <span className="font-extrabold text-slate-900 text-base block">{process.code} — {process.name}</span>
            <span className="text-xs text-slate-500 block">Versión Vigente {process.activeVersion} ({process.effectiveDate})</span>
          </div>
        </div>

        {/* Configuración de Dominio para Regenerar QR */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-slate-500" />
            Dominio / Host del Servidor Alco:
          </label>
          <input
            type="text"
            id="qr-custom-domain-input"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="https://calidad.alco.com.co"
            className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span className="truncate">URL: <code className="text-blue-600 font-bold">{targetUrl}</code></span>
            <button
              onClick={handleCopyUrl}
              className="text-blue-600 hover:underline font-bold flex items-center gap-1 shrink-0 ml-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar URL'}
            </button>
          </div>
        </div>

        {/* Acciones de Imprimir / Descargar */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadSVG}
            id="download-qr-svg-btn"
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Descargar SVG
          </button>

          <button
            onClick={handlePrint}
            id="print-qr-btn"
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir para Planta
          </button>
        </div>
      </div>
    </div>
  );
};
