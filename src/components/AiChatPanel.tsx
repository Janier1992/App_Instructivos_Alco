'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Bot, Send, RefreshCw, ShieldAlert, Camera, X, Mic, MicOff, ThumbsUp, ThumbsDown } from 'lucide-react';

interface AiChatPanelProps {
  processSlug: string;
  processName: string;
  processCode?: string;
  processVersion?: string;
  heightClassName?: string;
}

const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Las fotos de cámara pueden pesar varios MB — se redimensionan en el
// navegador antes de enviarlas para que la consulta viaje rápido incluso
// con señal débil en planta/obra, y para no arriesgar el límite de tamaño
// de request de las funciones serverless.
const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_JPEG_QUALITY = 0.8;

function compressImageFile(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg', previewUrl: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  processSlug,
  processName,
  processCode,
  processVersion,
  heightClassName = 'h-[650px]'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [commentBoxForId, setCommentBoxForId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const buildGreeting = (): ChatMessage => ({
    id: 'init-msg',
    role: 'assistant',
    content: `Hola. Soy el **Agente Especializado de Calidad** para el proceso de **${processName}**${processCode ? ` (${processCode}${processVersion ? ` ${processVersion}` : ''})` : ''}.

¿En qué puedo orientarte hoy? Puedes preguntarme sobre:
- Criterios de aceptación o rechazo.
- Tolerancias dimensionales o de acabado.
- Tu nivel de autonomía (Nivel 1 al 4) para tomar una decisión.
- Cuándo y a quién escalar una anomalía.

También puedes 📷 enviarme una foto de la pieza, o 🎤 dictar tu pregunta.`,
    timestamp: formatTime()
  });

  useEffect(() => {
    setMessages([buildGreeting()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processSlug]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // El navegador (no todos lo soportan — sobre todo Firefox de escritorio)
  // decide si mostramos el botón de dictado por voz.
  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognitionCtor);
  }, []);

  const toggleVoiceInput = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setInputQuery(prev => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const compressed = await compressImageFile(file);
      setPendingImage(compressed);
    } catch (err) {
      console.error('Error procesando la imagen:', err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    const imageToSend = pendingImage;
    if (!text.trim() && !imageToSend) return;
    if (isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim() || '(Foto adjunta)',
      timestamp: formatTime(),
      imageDataUrl: imageToSend?.previewUrl
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setPendingImage(null);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          question: text,
          history: messages,
          imageBase64: imageToSend?.base64,
          imageMimeType: imageToSend?.mimeType
        })
      });

      const resData = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: resData.reply || 'Error obteniendo respuesta.',
        timestamp: formatTime(),
        classification: resData.classification,
        sourceReferences: resData.sourceReferences,
        autonomyLevel: resData.autonomyLevel,
        escalationRequired: resData.escalationRequired,
        escalationReason: resData.escalationReason
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Ocurrió un error al consultar el motor RAG. Por favor intenta de nuevo.',
          timestamp: formatTime(),
          isError: true
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const submitFeedback = async (msg: ChatMessage, question: string, rating: 'up' | 'down', comment?: string) => {
    setFeedbackGiven(prev => ({ ...prev, [msg.id]: rating }));
    setCommentBoxForId(null);
    setCommentText('');
    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          question,
          reply: msg.content,
          classification: msg.classification,
          escalationRequired: msg.escalationRequired,
          rating,
          comment
        })
      });
    } catch (err) {
      console.error('Error enviando retroalimentación:', err);
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${heightClassName}`}>
      {/* Header del Chat */}
      <div className="bg-[#003366] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#002244]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white text-[#003366] flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight text-white">
              Agente de IA de Calidad — {processName}
            </h3>
            <p className="text-[11px] text-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              RAG Aislado {processCode ? `| Fuente Oficial ${processCode}${processVersion ? ` ${processVersion}` : ''}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([{
              id: 'reset-msg',
              role: 'assistant',
              content: `Chat reiniciado para el proceso de **${processName}**. ¿En qué puedo orientarte?`,
              timestamp: formatTime()
            }]);
            setFeedbackGiven({});
          }}
          className="p-1.5 text-slate-200 hover:text-white rounded-lg transition-colors"
          title="Reiniciar chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
        {messages.map((msg, idx) => {
          const isRateable = msg.role === 'assistant' && msg.id.startsWith('bot-');
          const precedingQuestion = isRateable ? messages[idx - 1]?.content || '' : '';
          const rating = feedbackGiven[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-xs ${
                msg.role === 'user' ? 'bg-slate-800' : 'bg-[#003366]'
              }`}>
                {msg.role === 'user' ? 'TÚ' : <Bot className="w-4 h-4" />}
              </div>

              <div className={`space-y-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#003366] text-white rounded-tr-none shadow-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                }`}>
                  {msg.imageDataUrl && (
                    <img
                      src={msg.imageDataUrl}
                      alt="Foto enviada"
                      className="w-full max-w-[220px] rounded-xl mb-2 border border-white/20"
                    />
                  )}
                  <div className="space-y-2 whitespace-pre-line">
                    {msg.content}
                  </div>

                  {msg.escalationRequired && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        Protocolo de Escalamiento Requerido
                      </div>
                      <p>{msg.escalationReason || 'Situación no cubierta suficientemente en la norma vigente.'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>

                  {isRateable && (
                    rating ? (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {rating === 'up' ? '¡Gracias por tu respuesta! 👍' : 'Gracias, lo revisaremos 🙏'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => submitFeedback(msg, precedingQuestion, 'up')}
                          title="Esta respuesta me sirvió"
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCommentBoxForId(commentBoxForId === msg.id ? null : msg.id)}
                          title="Esta respuesta no me sirvió"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  )}
                </div>

                {commentBoxForId === msg.id && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 w-full">
                    <p className="text-[11px] font-semibold text-rose-900">¿Qué faltó o qué estuvo mal? (opcional)</p>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                      maxLength={500}
                      className="w-full text-xs p-2 rounded-lg border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      placeholder="Ej: no encontré la tolerancia para este caso específico..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => submitFeedback(msg, precedingQuestion, 'down')}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Omitir y enviar
                      </button>
                      <button
                        onClick={() => submitFeedback(msg, precedingQuestion, 'down', commentText)}
                        className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-white rounded-xl border border-slate-200 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#003366]" />
            <span>Consultando norma oficial RAG de {processName}...</span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Chips de Preguntas Frecuentes de Planta */}
      <div className="p-2 bg-slate-100 border-t border-slate-200 flex gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <span className="font-bold text-slate-500 shrink-0 self-center px-2">Sugerencias:</span>
        <button
          onClick={() => handleSendMessage('¿Cuál es el criterio de aceptación y rechazo?')}
          className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-full border border-slate-300 shrink-0 font-medium"
        >
          Criterio Aceptación/Rechazo
        </button>
        <button
          onClick={() => handleSendMessage('¿Cuál es mi nivel de autonomía para tomar una decisión?')}
          className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-full border border-slate-300 shrink-0 font-medium"
        >
          Matriz de Autonomía N1-N4
        </button>
        <button
          onClick={() => handleSendMessage('¿Cuándo debo escalar a Calidad?')}
          className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-full border border-slate-300 shrink-0 font-medium"
        >
          ¿Cuándo debo escalar?
        </button>
      </div>

      {/* Vista previa de la foto seleccionada */}
      {(pendingImage || isProcessingImage) && (
        <div className="px-3 pt-3 bg-white border-t border-slate-200 flex items-center gap-2">
          {isProcessingImage ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Procesando foto...
            </div>
          ) : pendingImage && (
            <div className="relative w-16 h-16 shrink-0">
              <img src={pendingImage.previewUrl} alt="Foto a enviar" className="w-16 h-16 object-cover rounded-lg border border-slate-300" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center shadow"
                title="Quitar foto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Se enviará con tu próximo mensaje.</p>
        </div>
      )}

      {/* Input de Consulta */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-1.5"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelected}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isTyping || isProcessingImage}
          title="Adjuntar foto de la pieza"
          className="p-2.5 text-slate-500 hover:text-[#003366] hover:bg-slate-100 rounded-xl transition-colors shrink-0 disabled:opacity-50"
        >
          <Camera className="w-4.5 h-4.5" />
        </button>

        {speechSupported && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={isTyping}
            title={isListening ? 'Detener dictado' : 'Dictar pregunta por voz'}
            className={`p-2.5 rounded-xl transition-colors shrink-0 disabled:opacity-50 ${
              isListening ? 'text-white bg-rose-600 hover:bg-rose-700 animate-pulse' : 'text-slate-500 hover:text-[#003366] hover:bg-slate-100'
            }`}
          >
            {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>
        )}

        <input
          type="text"
          id="chat-input-query"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={isListening ? 'Escuchando...' : `Pregunta sobre el proceso de ${processName}...`}
          className="flex-1 min-w-0 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366] focus:bg-white"
        />
        <button
          type="submit"
          disabled={isTyping || (!inputQuery.trim() && !pendingImage)}
          id="send-chat-msg-btn"
          className="p-2.5 bg-[#003366] hover:bg-[#002244] disabled:opacity-50 text-white rounded-xl shadow-sm transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
