'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Bot, Send, RefreshCw, ShieldAlert } from 'lucide-react';

interface AiChatPanelProps {
  processSlug: string;
  processName: string;
  processCode?: string;
  processVersion?: string;
  heightClassName?: string;
}

const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const buildGreeting = (): ChatMessage => ({
    id: 'init-msg',
    role: 'assistant',
    content: `Hola. Soy el **Agente Especializado de Calidad** para el proceso de **${processName}**${processCode ? ` (${processCode}${processVersion ? ` ${processVersion}` : ''})` : ''}.

¿En qué puedo orientarte hoy? Puedes preguntarme sobre:
- Criterios de aceptación o rechazo.
- Tolerancias dimensionales o de acabado.
- Tu nivel de autonomía (Nivel 1 al 4) para tomar una decisión.
- Cuándo y a quién escalar una anomalía.`,
    timestamp: formatTime()
  });

  useEffect(() => {
    setMessages([buildGreeting()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processSlug]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: formatTime()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          question: text,
          history: messages
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
          onClick={() => setMessages([{
            id: 'reset-msg',
            role: 'assistant',
            content: `Chat reiniciado para el proceso de **${processName}**. ¿En qué puedo orientarte?`,
            timestamp: formatTime()
          }])}
          className="p-1.5 text-slate-200 hover:text-white rounded-lg transition-colors"
          title="Reiniciar chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
        {messages.map((msg) => (
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

              {msg.sourceReferences && msg.sourceReferences.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500 px-1">
                  <span className="font-bold text-[#003366]">Fuente Oficial:</span>
                  {msg.sourceReferences.map((sr, sIdx) => (
                    <span key={sIdx} className="px-2 py-0.5 bg-slate-200 rounded text-slate-700 font-mono">
                      {sr.documentTitle} ({sr.code} {sr.version})
                    </span>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-400 block px-1">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

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

      {/* Input de Consulta */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          id="chat-input-query"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={`Pregunta sobre el proceso de ${processName}...`}
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366] focus:bg-white"
        />
        <button
          type="submit"
          disabled={isTyping || !inputQuery.trim()}
          id="send-chat-msg-btn"
          className="p-2.5 bg-[#003366] hover:bg-[#002244] disabled:opacity-50 text-white rounded-xl shadow-sm transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
