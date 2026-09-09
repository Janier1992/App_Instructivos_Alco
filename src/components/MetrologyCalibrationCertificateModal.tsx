'use client';

import React from 'react';
import { X, FileText } from 'lucide-react';

interface Props {
  toolName: string;
  certificateUrl: string;
  isPdf: boolean;
  onClose: () => void;
}

/** Visor del certificado de calibración — imagen o PDF servidos desde Storage vía URL firmada. */
export const MetrologyCalibrationCertificateModal: React.FC<Props> = ({ toolName, certificateUrl, isPdf, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#003366]" /> Certificado — {toolName}
          </h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="flex-1 bg-slate-100 flex items-center justify-center min-h-[400px] overflow-y-auto p-4">
          {isPdf ? (
            <iframe src={certificateUrl} title="Certificado PDF" className="w-full h-[60vh] rounded-xl border-0 bg-white" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={certificateUrl} alt={`Certificado de ${toolName}`} className="max-h-[60vh] max-w-full object-contain rounded-xl shadow" />
          )}
        </div>
      </div>
    </div>
  );
};
