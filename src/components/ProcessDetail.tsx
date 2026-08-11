import React, { useState, useEffect, useRef } from 'react';
import { 
  ProcessItem, 
  DocumentItem, 
  QualityControl, 
  AcceptanceCriterion, 
  AutonomyLevelItem, 
  ChatMessage 
} from '../types';
import { 
  ArrowLeft, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Bot, 
  Send, 
  FileText, 
  Sliders, 
  UserCheck, 
  History, 
  Download, 
  Info, 
  RefreshCw,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';

interface ProcessDetailProps {
  slug: string;
  onBack: () => void;
  onOpenQRModal: (process: ProcessItem) => void;
}

export const ProcessDetail: React.FC<ProcessDetailProps> = ({
  slug,
  onBack,
  onOpenQRModal
}) => {
  const [activeTab, setActiveTab] = useState<'autonomia' | 'documentos' | 'chat'>('autonomia');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    process: ProcessItem;
    documents: DocumentItem[];
    controls: QualityControl[];
    criteria: AcceptanceCriterion[];
    autonomy: AutonomyLevelItem[];
  } | null>(null);

  // Estado del Chat IA
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/processes/${slug}`)
      .then(res => res.json())
      .then(resData => {
        if (isMounted && resData.process) {
          setData(resData);
          setLoading(false);
          // Mensaje inicial del Bot
          setMessages([
            {
              id: 'init-msg',
              role: 'assistant',
              content: `Hola. Soy el **Agente Especializado de Calidad** para el proceso de **${resData.process.name}** (${resData.process.code} ${resData.process.activeVersion}).

¿En qué puedo orientarte hoy? Puedes preguntarme sobre:
- Criterios de aceptación o rechazo.
- Tolerancias dimensionales o de acabado.
- Tu nivel de autonomía (Nivel 1 al 4) para tomar una decisión.
- Cuándo y a quién escalar una anomalía.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      })
      .catch(err => {
        console.error('Error cargando detalle del proceso:', err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [slug]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isTyping || !data) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug: slug,
          question: text,
          history: messages
        })
      });

      const resData = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: resData.reply || 'Error obteniendo respuesta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#003366] animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Cargando estándar de calidad...</p>
      </div>
    );
  }

  const { process, documents, controls, criteria, autonomy } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Botón Volver & Header del Proceso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            id="back-to-processes-btn"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Volver a la lista de procesos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#003366]">
                {process.name}
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md uppercase">
                {process.activeVersion} Vigente
              </span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {process.code}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {process.department} • Vigencia: {process.effectiveDate}
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenQRModal(process)}
            id="open-process-qr-btn"
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#003366] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-all"
          >
            <QrCode className="w-4 h-4 text-[#003366]" />
            Código QR de Proceso
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            id="open-process-ai-tab-btn"
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-[#002244] rounded-lg shadow-sm transition-all"
          >
            <Bot className="w-4 h-4" />
            Agente IA de Calidad
          </button>
        </div>
      </div>

      {/* Navegación por Tabs de Proceso Exclusivamente Solicitados */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('autonomia')}
          id="tab-autonomia"
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap rounded-t-xl transition-colors border-b-2 min-h-[44px] ${
            activeTab === 'autonomia'
              ? 'border-[#003366] text-[#003366] bg-blue-50/80 shadow-xs font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4 text-[#003366] shrink-0" />
          <span>Matriz de Autonomía</span>
        </button>

        <button
          onClick={() => setActiveTab('documentos')}
          id="tab-documentos"
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap rounded-t-lg transition-colors border-b-2 min-h-[44px] ${
            activeTab === 'documentos'
              ? 'border-[#003366] text-[#003366] bg-blue-50/80 shadow-xs font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 text-[#003366] shrink-0" />
          <span>Documentos Vigentes ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          id="tab-chat"
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap rounded-t-lg transition-colors border-b-2 min-h-[44px] ${
            activeTab === 'chat'
              ? 'border-[#003366] text-[#003366] bg-blue-50/80 shadow-xs font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Agente IA de Calidad</span>
        </button>
      </div>

      {/* MODULO 1: MATRIZ DE AUTONOMÍA */}
      {activeTab === 'autonomia' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-[#003366] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#003366]" />
                Matriz de Autonomía Alco (Nivel 1 a Nivel 4)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define las atribuciones y límites de decisión autorizados por rol para el proceso de {process.name}.
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-[#003366] text-xs font-bold border border-blue-200 rounded-lg shrink-0">
              {process.code} — Nivel 1 a 4
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autonomy.map((item, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3 flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="px-3 py-1 text-xs font-extrabold bg-[#003366] text-white rounded-md shadow-xs">
                      {item.level}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">{item.role}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-600 italic">"{item.scope}"</p>

                  <div className="pt-2 space-y-1">
                    <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider block">Acciones Autorizadas:</span>
                    <ul className="text-xs text-slate-700 space-y-1">
                      {item.allowedActions.map((act, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 bg-amber-50/70 p-3 rounded-lg border border-amber-200 space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 uppercase">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Condición de Escalamiento
                  </span>
                  <p className="text-xs text-amber-900 font-medium">{item.escalationCondition}</p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Contacto: <strong>{item.contactPerson}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULO 2: DOCUMENTOS VIGENTES */}
      {activeTab === 'documentos' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-[#003366] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#003366]" />
                Documentos Vigentes de Procesos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Infografías oficiales, instructivos, fichas técnicas y criterios de calidad vigentes para {process.name}.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 rounded-lg shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Documentación Oficial Activa
            </span>
          </div>

          {/* Ficha Resumen de Infografía Oficial */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-[#003366]" />
                {process.infographicTitle}
              </h4>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded">
                {process.code} {process.activeVersion}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {process.infographicSummary}
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider block mb-1">
                Controles Críticos de la Infografía:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {process.keyAspects.map((aspect, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#003366] shrink-0" />
                    <span>{aspect}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Criterios de Aceptación y Rechazo Incluidos */}
          {criteria.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-[#003366] uppercase tracking-wider">
                Criterios de Inspección y Aceptación/Rechazo
              </h4>
              <div className="space-y-3">
                {criteria.map((c, idx) => (
                  <div key={c.id || idx} className="rounded-xl border border-slate-200 overflow-hidden text-xs shadow-2xs">
                    <div className="bg-[#003366] text-white px-4 py-2 font-bold flex items-center justify-between">
                      <span>Parámetro: {c.parameter}</span>
                      <span className="text-[10px] text-slate-300 font-mono">Ref: {c.controlId}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
                      <div className="p-3 bg-emerald-50/30">
                        <span className="font-bold text-emerald-800 block mb-1">✓ Criterio de Aceptación:</span>
                        <p className="text-slate-800">{c.acceptance}</p>
                      </div>
                      <div className="p-3 bg-rose-50/30">
                        <span className="font-bold text-rose-800 block mb-1">✕ Criterio de Rechazo:</span>
                        <p className="text-slate-800">{c.rejection}</p>
                      </div>
                      <div className="p-3 bg-amber-50/30">
                        <span className="font-bold text-amber-900 block mb-1">⚠ Acción Requerida:</span>
                        <p className="text-slate-800">{c.requiredAction}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listado de Documentos del Proceso */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-[#003366] uppercase tracking-wider">
              Documentos Normativos Oficiales
            </h4>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className={`p-5 rounded-xl border transition-all ${
                    doc.status === 'vigente'
                      ? 'border-emerald-300 bg-emerald-50/20 shadow-2xs'
                      : 'border-slate-200 bg-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-5 h-5 ${doc.status === 'vigente' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-600">{doc.code}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md uppercase ${
                        doc.status === 'vigente' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {doc.version} - {doc.status}
                      </span>
                    </div>
                  </div>

                  <div className="py-3 text-xs text-slate-700 space-y-2 whitespace-pre-line font-mono bg-white p-4 rounded-lg border border-slate-200 mt-3">
                    {doc.contentText}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Autor: {doc.owner}</span>
                    <span>Aprobado por: {doc.approvedBy}</span>
                    <span>Vigencia: {doc.effectiveDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULO 3: AGENTE DE IA DE CALIDAD */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          {/* Header del Chat */}
          <div className="bg-[#003366] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#002244]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white text-[#003366] flex items-center justify-center font-bold shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-white">
                  Agente de IA de Calidad — {process.name}
                </h3>
                <p className="text-[11px] text-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  RAG Aislado | Fuente Oficial {process.code} {process.activeVersion}
                </p>
              </div>
            </div>

            <button
              onClick={() => setMessages([{
                id: 'reset-msg',
                role: 'assistant',
                content: `Chat reiniciado para el proceso de **${process.name}**. ¿En qué puedo orientarte?`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
                <span>Consultando norma oficial RAG de {process.name}...</span>
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
              placeholder={`Pregunta sobre el proceso de ${process.name}...`}
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
      )}
    </div>
  );
};
