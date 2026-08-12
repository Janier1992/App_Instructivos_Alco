import React, { useState, useEffect } from 'react';
import { X, Save, Bot, Database, Copy } from 'lucide-react';
import { RagAgentConfig } from '../lib/agentConfigStore';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabaseService';

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({ isOpen, onClose }) => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tone, setTone] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      try {
        const res = await fetch('/api/agent/config');
        const data: RagAgentConfig = await res.json();
        setSystemPrompt(data.systemPrompt);
        setTone(data.tone);

        const healthRes = await fetch('/api/health');
        const healthData = await healthRes.json();
        setSupabaseConnected(healthData.supabaseConnected ?? false);
      } catch (err) {
        console.error('Error cargando configuración del agente:', err);
      }
    };

    loadConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      const res = await fetch('/api/agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, tone })
      });
      const data = await res.json();
      if (data.success) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error guardando configuración:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Ajustes del Agente IA</h3>
              <p className="text-xs text-slate-500">Tono, instrucciones y persistencia de Supabase.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Instrucción del Sistema (System Prompt):</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Rige las reglas de respuesta del asistente: fidelidad a la documentación, cero alucinación y formato.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tono de Voz:</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? '¡Guardado con Éxito!' : 'Guardar Cambios'}</span>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Persistencia Supabase</h4>
                <p className="text-[11px] text-slate-500">Almacenamiento de documentos RAG entre reinicios</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              supabaseConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              {supabaseConnected ? 'Conectado' : 'Sin Conectar'}
            </span>
          </div>

          <button
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{showSqlSchema ? 'Ocultar Script SQL Supabase' : 'Ver / Copiar Script SQL de Tablas Supabase'}</span>
          </button>

          {showSqlSchema && (
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono space-y-2 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-slate-700 text-slate-400">
                <span>Esquema SQL para Supabase Editor</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                    alert('Script SQL de Supabase copiado al portapapeles');
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
