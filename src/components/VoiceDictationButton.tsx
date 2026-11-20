'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

interface Props {
  /** Recibe cada frase dictada ya reconocida, para agregarla al campo de texto. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed': 'El navegador no tiene permiso para usar el micrófono. Permítelo en la barra de direcciones y vuelve a intentar.',
  'service-not-allowed': 'El navegador no tiene permiso para usar el micrófono. Permítelo en la barra de direcciones y vuelve a intentar.',
  'audio-capture': 'No se encontró un micrófono disponible.',
  network: 'El dictado necesita conexión a internet.'
};

/**
 * Dictado por voz con el reconocimiento de voz del navegador (Chrome, Edge y
 * Android). Reconoce español de Colombia y entrega cada frase al formulario;
 * la IA se encarga luego de ordenar y redactar el texto. Si el navegador no
 * lo soporta, el botón no se muestra.
 */
export const VoiceDictationButton: React.FC<Props> = ({ onTranscript, disabled }) => {
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(Boolean(Recognition));
    return () => recognitionRef.current?.abort();
  }, []);

  const start = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = 'es-CO';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) onTranscriptRef.current(String(event.results[i][0].transcript).trim());
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') setMessage(RECOGNITION_ERRORS[event.error] || 'No se pudo usar el dictado. Intenta de nuevo.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setMessage(null);
    setListening(true);
    recognition.start();
  };

  const toggle = () => (listening ? recognitionRef.current?.stop() : start());

  if (!supported) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? 'Detener dictado' : 'Dictar con el micrófono'}
        className={`flex items-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-1 border transition disabled:opacity-50 ${listening ? 'bg-rose-600 border-rose-600 text-white animate-pulse' : 'text-[#003366] border-[#003366] hover:bg-blue-50'}`}
      >
        {listening ? <><Square className="w-3 h-3" /> Detener</> : <><Mic className="w-3 h-3" /> Dictar</>}
      </button>
      {message && <span className="text-[10px] font-medium text-rose-700">{message}</span>}
    </span>
  );
};
