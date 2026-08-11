import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  ToggleLeft, 
  ToggleRight, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Filter,
  RefreshCw
} from 'lucide-react';
import { WhatsAppConversation, WhatsAppMessage } from '../types';

export const WhatsAppConversations: React.FC = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  // Cargar lista de conversaciones
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/whatsapp/conversations');
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (!activeConversationId && data.conversations.length > 0) {
          setActiveConversationId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando conversaciones:', err);
    }
  };

  // Cargar mensajes de la conversación activa
  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/messages/${convId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  const activeConv = conversations.find(c => c.id === activeConversationId);

  const handleToggleBot = async (convId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/whatsapp/toggle-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, active: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, botActive: !currentStatus } : c));
      }
    } catch (err) {
      console.error('Error al alternar bot:', err);
    }
  };

  const handleSendHumanReply = async () => {
    if (!replyText.trim() || !activeConversationId || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          text: replyText,
          sender: 'human'
        })
      });

      const data = await res.json();
      if (data.userMsg) {
        setMessages(prev => [...prev, data.userMsg]);
        setReplyText('');
        loadConversations();
      }
    } catch (err) {
      console.error('Error al responder como humano:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.contact.fullName.toLowerCase().includes(filterText.toLowerCase()) ||
    c.contact.waPhone.includes(filterText) ||
    (c.processSlug && c.processSlug.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Informativo */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Centro de Conversaciones de WhatsApp</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Supervisión de Planta
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoreo en tiempo real de chats recibidos vía WhatsApp Cloud API. Permite alternar la intervención del Bot o responder manualmente como Operador Humano.
          </p>
        </div>

        <button
          onClick={loadConversations}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          Actualizar Conversaciones
        </button>
      </div>

      {/* Grid de 2 Columnas: Lista de Chats + Detalle de Conversación */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
        {/* LISTA DE CONVERSACIONES (Columna Izquierda) */}
        <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Buscar por colaborador, número o proceso..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const dateStr = new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    isActive ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/80'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                    {conv.contact.fullName.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {conv.contact.fullName}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">{dateStr}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      {conv.contact.waPhone}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-full truncate max-w-[120px]">
                        {conv.processSlug || 'General'}
                      </span>

                      {conv.botActive ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bot className="w-3 h-3 text-emerald-600" />
                          Bot Activo
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <User className="w-3 h-3 text-amber-600" />
                          Humano
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No se encontraron conversaciones.
              </div>
            )}
          </div>
        </div>

        {/* DETALLE Y CHAT CON OPERADOR (Columna Derecha) */}
        <div className="lg:col-span-8 flex flex-col bg-white">
          {activeConv ? (
            <>
              {/* Header de Conversación Activa */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {activeConv.contact.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{activeConv.contact.fullName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{activeConv.contact.waPhone}</span>
                      <span>•</span>
                      <span className="font-medium text-blue-700">Módulo: {activeConv.processSlug}</span>
                    </p>
                  </div>
                </div>

                {/* Control Toggle Bot Activo */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">
                      {activeConv.botActive ? 'Agente de IA Activo' : 'Atención Humana Asignada'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {activeConv.botActive ? 'Responde automáticamente con RAG' : 'Respuesta manual activa'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleBot(activeConv.id, activeConv.botActive)}
                    className="transition focus:outline-none"
                    title={activeConv.botActive ? "Pausar bot para responder como humano" : "Reactivar respuesta automática del bot"}
                  >
                    {activeConv.botActive ? (
                      <ToggleRight className="w-9 h-9 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Área de Mensajes de Conversación */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 min-h-[380px]">
                {messages.map((m) => {
                  const isUser = m.sender === 'contact';
                  const isHuman = m.sender === 'human';

                  return (
                    <div
                      key={m.id}
                      className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                          isUser
                            ? 'bg-slate-200 text-slate-900 rounded-tl-none'
                            : isHuman
                            ? 'bg-amber-100 border border-amber-300 text-amber-950 rounded-tr-none'
                            : 'bg-emerald-700 text-white rounded-tr-none'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-80 mb-1 border-b border-black/10 pb-0.5">
                          <span>
                            {isUser ? m.sender : isHuman ? 'Supervisor Humano' : 'Agente IA Bot'}
                          </span>
                          <span>{m.timestamp}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input de Respuesta de Operador Humano */}
              <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendHumanReply()}
                  placeholder="Escribir respuesta directa como Supervisor de Calidad..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={handleSendHumanReply}
                  disabled={isLoading || !replyText.trim()}
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-sm">
              Selecciona una conversación para inspeccionar sus mensajes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
