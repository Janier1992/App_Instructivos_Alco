'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2, ExternalLink, Download, AlertTriangle } from 'lucide-react';

interface Props {
  tema: string;
  /** Código del enlace público; null si falta ejecutar la migración que lo crea. */
  registroToken: string | null;
  onClose: () => void;
}

const QR_WIDTH_PX = 320;

/** Enlace y código QR para que los colaboradores registren su asistencia desde el celular, sin entrar a la aplicación. */
export const DivulgacionLinkModal: React.FC<Props> = ({ tema, registroToken, onClose }) => {
  const [link, setLink] = useState('');
  const [directLink, setDirectLink] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    // Un único enlace para todas las divulgaciones; el enlace directo deja elegida esta divulgación.
    const url = `${window.location.origin}/asistencia`;
    setLink(url);
    setDirectLink(registroToken ? `${url}?d=${registroToken}` : '');
    QRCode.toDataURL(url, { width: QR_WIDTH_PX, margin: 1, color: { dark: '#003366', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [registroToken]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Respaldo para navegadores sin portapapeles asíncrono.
      const field = document.createElement('textarea');
      field.value = link;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[94vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900">Enlace de registro de asistencia</h3>
            <p className="text-xs text-slate-500 mt-0.5">{tema}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {!registroToken ? (
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>Esta divulgación aún no tiene enlace. Ejecuta en Supabase el script <b>db/migrate_add_divulgacion_token.sql</b> y recarga la lista.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600">Este es el mismo enlace para todos los colaboradores y para todas las divulgaciones: lo abren en su celular, eligen el comunicado o la divulgación en un menú desplegable (aparecen los de los últimos 60 días, sin tener que crear antes la planilla; esta se crea sola con el primer registro) y registran su nombre, cédula, proceso o sección y firma, sin entrar a la aplicación. Solo ven el tema, no a los asistentes.</p>
            <div className="flex items-center gap-2">
              <input readOnly value={link} onFocus={e => e.currentTarget.select()} aria-label="Enlace de registro" className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs" />
              <button type="button" onClick={copy} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-[#003366] rounded-lg">{copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}</button>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {qr && (
                <div className="space-y-1.5 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="Código QR del enlace de registro" className="w-40 h-40 border border-slate-200 rounded-xl" />
                  <a href={qr} download="qr-registro-asistencia.png" className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#003366] hover:underline"><Download className="w-3 h-3" /> Descargar QR</a>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {canShare && <button type="button" onClick={() => navigator.share({ title: 'Registro de asistencia', text: tema, url: link }).catch(() => undefined)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#003366] border border-[#003366] rounded-lg"><Share2 className="w-3.5 h-3.5" /> Compartir</button>}
                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#003366] border border-[#003366] rounded-lg"><ExternalLink className="w-3.5 h-3.5" /> Abrir la página</a>
              </div>
            </div>
            {directLink && (
              <details className="text-[11px] text-slate-500">
                <summary className="cursor-pointer font-semibold">Enlace directo a esta divulgación (opcional)</summary>
                <p className="mt-1">Útil si hay varias divulgaciones el mismo día: abre el registro con esta ya elegida.</p>
                <input readOnly value={directLink} onFocus={e => e.currentTarget.select()} aria-label="Enlace directo a esta divulgación" className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs" />
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
};
