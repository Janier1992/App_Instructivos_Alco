import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Phone, 
  Mic, 
  Paperclip, 
  QrCode, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { ProcessItem, WhatsAppMessage } from '../types';

interface WhatsAppSimulatorProps {
  processes: ProcessItem[];
  selectedProcessSlug?: string | null;
  onSelectProcessSlug?: (slug: string) => void;
  onOpenScanner?: () => void;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  processes,
  selectedProcessSlug,
  onSelectProcessSlug,
  onOpenScanner
}) => {
  const activeSlug = selectedProcessSlug || 'corte-perfileria';
  const activeProcess = processes.find(p => p.slug === activeSlug) || processes[0];

  const [phone, setPhone] = useState('+573104567890');
  const [workerName, setWorkerName] = useState('Carlos Gómez (Planta)');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Inicializar conversación con saludo contextual del proceso
  useEffect(() => {
    const welcomeMsg: WhatsAppMessage = {
      id: `init-${activeSlug}`,
      conversationId: 'sim-conv',
      direction: 'outbound',
      sender: 'bot',
      content: `👋 **¡Hola! Bienvenido al Agente Oficial de WhatsApp de Calidad Alco S.A.S.**

📌 **Proceso Seleccionado:** ${activeProcess ? activeProcess.name.toUpperCase() : 'Corte y Perfilería'} (${activeProcess?.code || 'INS-COR-01'})

Estoy conectado en tiempo real con las **Normas Oficiales Vigentes** y la **Matriz de Autonomía**. Puedes consultarme:

• 📐 Tolerancias y criterios de aceptación/rechazo
• ⚠️ Reportar no conformidades o solicitar escalamiento
• 👤 Transferir consulta a un Supervisor Humano

¿En qué puedo orientarte en este momento?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
  }, [activeSlug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: WhatsAppMessage = {
      id: `user-${Date.now()}`,
      conversationId: conversationId || 'sim-conv',
      direction: 'inbound',
      sender: 'contact',
      content: textToSend,
      timestamp: userTime
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/whatsapp/chat-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name: workerName,
          processSlug: activeSlug,
          text: textToSend
        })
      });

      const data = await res.json();

      if (data.botMsg) {
        setMessages(prev => [
          ...prev,
          {
            ...data.botMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
      if (data.botActive !== undefined) {
        setBotActive(data.botActive);
      }
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversationId: 'sim-conv',
          direction: 'outbound',
          sender: 'bot',
          content: '⚠️ Ocurrió una interrupción en la conexión con el Agente de WhatsApp. Por favor intenta de nuevo.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickOption = (promptText: string) => {
    handleSendMessage(promptText);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Banner Superior Explicativo */}
      <div className="bg-gradient-to-r from-[#003366] via-[#002244] to-slate-900 text-white rounded-2xl p-5 mb-6 shadow-lg border border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400 mt-1 sm:mt-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg text-white">Simulador de Agente WhatsApp Alco</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Meta Graph API v25.0 Activo
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Simulación interactiva de WhatsApp Cloud API para colaboradores y clientes que escanean plantillas físicas de procesos en planta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={onOpenScanner}
            className="flex-1 md:flex-initial px-3.5 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <QrCode className="w-4 h-4 text-emerald-300" />
            Escanear QR de Plantilla
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL IZQUIERDO: Selector de Proceso + Opciones Rápidas */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: Proceso Seleccionado */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Proceso Activo en Plantilla Física:
            </label>
            <select
              value={activeSlug}
              onChange={(e) => onSelectProcessSlug?.(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {processes.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>

            {activeProcess && (
              <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1">
                <p className="font-bold text-blue-900">{activeProcess.infographicTitle}</p>
                <p className="text-slate-600 line-clamp-2">{activeProcess.infographicSummary}</p>
                <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium pt-1">
                  <span>Versión: {activeProcess.activeVersion}</span>
                  <span>Vigente: {activeProcess.effectiveDate}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Datos de Simulación de Usuario */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Identidad del Remitente WhatsApp
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                Colaborador
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nombre Completo:</label>
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Teléfono (E.164 WhatsApp):</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Card: Consultas Frecuentes y Triggers Rápidos */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Pruebas Rápidas de Agente (Triggers RAG)
            </h3>

            <button
              onClick={() => handleQuickOption(`¿Cuáles son las tolerancias permitidas en el proceso de ${activeProcess?.name || 'Corte'}?`)}
              className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium transition flex items-center justify-between group"
            >
              <span>📐 Consultar Tolerancia Dimensional</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </button>

            <button
              onClick={() => handleQuickOption(`Quiero escalar esta situación con un supervisor de calidad para ${activeProcess?.name || 'Corte'}`)}
              className="w-full text-left p-2.5 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium transition flex items-center justify-between group"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Solicitar Escalamiento / Handoff
              </span>
              <ChevronRight className="w-4 h-4 text-amber-500" />
            </button>

            <button
              onClick={() => handleQuickOption(`¿Cuál es mi nivel de autonomía para tomar decisiones en ${activeProcess?.name || 'este proceso'}?`)}
              className="w-full text-left p-2.5 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-medium transition flex items-center justify-between group"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Consultar Matriz de Autonomía
              </span>
              <ChevronRight className="w-4 h-4 text-indigo-500" />
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: VISTA DEL CHAT ESTILO WHATSAPP WEB */}
        <div className="lg:col-span-8 bg-[#efeae2] border border-slate-300 rounded-2xl shadow-md overflow-hidden flex flex-col h-[650px]">
          {/* Header del Chat WhatsApp */}
          <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white border border-emerald-500 shadow-inner">
                  <Bot className="w-6 h-6 text-emerald-200" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#075e54]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  Agente Calidad Alco
                  <span className="bg-emerald-800 text-[10px] font-normal px-2 py-0.5 rounded text-emerald-200 border border-emerald-600">
                    Bot
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                  {botActive ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      En línea • Asistente RAG + Agenda + Handoff
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Modo Humano Asignado (Bot pausado)
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setMessages([])}
                className="text-emerald-200 hover:text-white text-xs flex items-center gap-1 bg-emerald-800/60 hover:bg-emerald-800 px-2.5 py-1 rounded-lg transition"
                title="Limpiar historial de chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Sub-header de Proceso Activo */}
          <div className="bg-[#128c7e] text-emerald-50 px-4 py-1.5 text-xs font-medium flex items-center justify-between border-t border-emerald-700/50">
            <span className="flex items-center gap-1.5 truncate">
              <FileText className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
              Módulo: <strong className="text-white">{activeProcess?.name}</strong> ({activeProcess?.code})
            </span>
            <span className="text-[11px] bg-emerald-950/40 px-2 py-0.5 rounded text-emerald-200 shrink-0">
              WhatsApp Cloud API
            </span>
          </div>

          {/* Área de Mensajes (Scrollable) */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'contact';
              const isHumanOperator = msg.sender === 'human';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none border border-emerald-200'
                        : isHumanOperator
                        ? 'bg-amber-50 text-amber-950 rounded-tl-none border border-amber-200'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mb-1 border-b border-slate-100 pb-1">
                        {isHumanOperator ? (
                          <>
                            <User className="w-3 h-3 text-amber-600" />
                            <span className="text-amber-800">Supervisor de Calidad (Humano)</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-800">Agente RAG Alco</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>El Agente de WhatsApp está consultando normas y ejecutando tools...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chips de Respuestas Rápidas Sugeridas */}
          <div className="bg-[#f0f2f5] border-t border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Acciones:</span>
            <button
              onClick={() => handleSendMessage('¿Cuáles son las tolerancias permitidas de corte?')}
              className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-300 rounded-full shrink-0 shadow-2xs transition"
            >
              📐 Tolerancias
            </button>
            <button
              onClick={() => handleSendMessage('¿Qué hacer si hay desportilladuras o rayaduras?')}
              className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-300 rounded-full shrink-0 shadow-2xs transition"
            >
              ⚠️ Criterios de Rechazo
            </button>
            <button
              onClick={() => handleSendMessage('Transferir a un supervisor humano')}
              className="px-2.5 py-1 text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium border border-amber-300 rounded-full shrink-0 shadow-2xs transition"
            >
              👤 Escalar a Humano
            </button>
          </div>

          {/* Área de Entrada de Mensajes */}
          <div className="bg-[#f0f2f5] p-3 border-t border-slate-200 flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition"
              title="Adjuntar foto de defecto (Simulado)"
              onClick={() => handleSendMessage('📷 [Foto de Defecto Adjuntada] Presenta ralladuras continuas de extrusión.')}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="button"
              className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition"
              title="Nota de voz (Simulado)"
              onClick={() => handleSendMessage('🎙️ [Nota de voz enviada]: ¿Cuál es la prueba para espesores de pintura?')}
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={botActive ? "Escribe tu consulta sobre tolerancias o citas por WhatsApp..." : "Atención humana activa..."}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#128c7e]"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="w-10 h-10 rounded-full bg-[#128c7e] hover:bg-[#075e54] text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
