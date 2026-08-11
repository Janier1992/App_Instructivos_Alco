import React, { useState, useEffect } from 'react';
import {
  Save,
  Copy,
  Bot,
  Sparkles,
  RefreshCw,
  Database,
  FileText,
  UploadCloud,
  FileCheck,
  Trash2,
  Eye,
  BookOpen,
  Search,
  FilePlus,
  AlertCircle,
  X
} from 'lucide-react';
import { RagAgentConfig } from '../lib/agentConfigStore';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabaseService';
import { CustomRagDocument } from '../lib/customRagStore';

export const AgentConfigView: React.FC = () => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tone, setTone] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  // ESTADOS DEL MÓDULO RAG PDF
  const [ragDocs, setRagDocs] = useState<CustomRagDocument[]>([]);
  const [selectedProcessForUpload, setSelectedProcessForUpload] = useState('corte-perfileria');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitleInput, setUploadTitleInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Estados Sandbox RAG Query
  const [ragSandboxQuery, setRagSandboxQuery] = useState('¿Qué especifica la norma técnica o PDF sobre tolerancias en corte?');
  const [ragSandboxProcess, setRagSandboxProcess] = useState('corte-perfileria');
  const [isExecutingRagSandbox, setIsExecutingRagSandbox] = useState(false);
  const [ragSandboxResult, setRagSandboxResult] = useState<any>(null);

  // Modal para ver contenido extraído de PDF
  const [previewingDoc, setPreviewingDoc] = useState<CustomRagDocument | null>(null);

  const loadRagDocs = async () => {
    try {
      const res = await fetch('/api/rag/documents');
      const data = await res.json();
      if (data.success) {
        setRagDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Error cargando documentos RAG:', err);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/agent/config');
      const data: RagAgentConfig = await res.json();
      setSystemPrompt(data.systemPrompt);
      setTone(data.tone);

      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      setSupabaseConnected(healthData.supabaseConnected ?? false);

      await loadRagDocs();
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedFile) {
      setUploadMsg('⚠️ Por favor selecciona un archivo PDF válido.');
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadMsg('⚠️ El archivo seleccionado debe estar en formato PDF.');
      return;
    }

    setIsUploading(true);
    setUploadMsg('⏳ Leyendo y extrayendo texto del PDF para el motor RAG...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        const res = await fetch('/api/rag/upload-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            processSlug: selectedProcessForUpload,
            title: uploadTitleInput || selectedFile.name.replace(/\.pdf$/i, '')
          })
        });

        const data = await res.json();
        if (data.success) {
          setUploadMsg(`✅ ¡Éxito! PDF "${selectedFile.name}" procesado e indexado en el motor RAG.`);
          setSelectedFile(null);
          setUploadTitleInput('');
          await loadRagDocs();
        } else {
          setUploadMsg(`❌ Error: ${data.error}`);
        }
        setIsUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setUploadMsg(`❌ Error al cargar archivo: ${err.message}`);
      setIsUploading(false);
    }
  };

  const handleDeletePdfDoc = async (docId: string) => {
    if (!confirm('¿Estás seguro de eliminar este PDF del motor RAG?')) return;
    try {
      const res = await fetch(`/api/rag/documents/${docId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await loadRagDocs();
      }
    } catch (err) {
      console.error('Error al eliminar PDF:', err);
    }
  };

  const handleRunRagSandbox = async () => {
    if (!ragSandboxQuery.trim()) return;
    setIsExecutingRagSandbox(true);
    setRagSandboxResult(null);

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug: ragSandboxProcess,
          question: ragSandboxQuery,
          customPrompt: systemPrompt
        })
      });

      const data = await res.json();
      if (data.success) {
        setRagSandboxResult(data);
      } else {
        setRagSandboxResult({ error: data.error });
      }
    } catch (err: any) {
      setRagSandboxResult({ error: err.message });
    } finally {
      setIsExecutingRagSandbox(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Informativo */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Personalización del Agente IA de Calidad</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              Google AI Studio (Gemini 3.6 Flash)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ajusta el tono y las instrucciones del agente, y gestiona los documentos PDF que alimentan el motor RAG por proceso.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSaved ? '¡Guardado con Éxito!' : 'Guardar Cambios'}</span>
        </button>
      </div>

      {/* MÓDULO RAG: GESTIÓN DE PDFS TÉCNICOS Y CONSULTA DE BASE DE CONOCIMIENTO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Módulo RAG - Carga de PDFs Técnicos de Calidad</h3>
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Indexación Automática
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sube manuales técnicos, normas ISO y fichas de procesos en PDF. El contenido es extraído e integrado automáticamente a la base de conocimiento de Gemini 3.6 Flash.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              📚 Documentos RAG Activos: <strong className="text-purple-700">{ragDocs.length}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA 1: FORMULARIO DE SUBIDA DE PDF */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              <UploadCloud className="w-4 h-4 text-purple-600" />
              <span>Subir Nuevo Documento PDF Técnico</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Proceso de Planta Asociado:</label>
                <select
                  value={selectedProcessForUpload}
                  onChange={(e) => setSelectedProcessForUpload(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="corte-perfileria">✂️ Corte y Perfilería</option>
                  <option value="pintura">🎨 Pintura Electrostática</option>
                  <option value="troquelado">⚙️ Troquelado y Mecanizado</option>
                  <option value="vidrio-crudo-templado">🧊 Vidrio Templado</option>
                  <option value="ensamble">🔩 Ensamble Final</option>
                  <option value="empaques-felpas">📐 Empaques y Felpas</option>
                  <option value="general">🏭 General / Toda la Planta</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Título Personalizado (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: Manual Técnico de Tronzadoras Alco 2026"
                  value={uploadTitleInput}
                  onChange={(e) => setUploadTitleInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Seleccionar Archivo PDF:</label>
                <div className="border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 rounded-xl p-4 text-center cursor-pointer transition relative">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FilePlus className="w-8 h-8 text-purple-600 mx-auto mb-1" />
                  {selectedFile ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-purple-900 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-purple-800">Haz clic o arrastra un archivo PDF aquí</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Soporta documentos técnicos, normas e infografías</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleUploadPdf}
                disabled={isUploading || !selectedFile}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{isUploading ? 'Procesando e Indexando PDF...' : 'Indexar PDF en Motor RAG'}</span>
              </button>

              {uploadMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  uploadMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                  uploadMsg.startsWith('⏳') ? 'bg-purple-50 text-purple-900 border-purple-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {uploadMsg}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 2: LISTA DE PDFS RAG INDEXADOS */}
          <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Documentos PDF Indexados en el RAG</span>
                </div>
                <button
                  onClick={loadRagDocs}
                  className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Actualizar
                </button>
              </div>

              {ragDocs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No hay archivos PDF cargados manualmente todavía.</p>
                  <p className="text-[11px] text-slate-400">Sube un documento técnico en la columna izquierda para incorporarlo a Gemini.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {ragDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">{doc.title}</span>
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {doc.code}
                          </span>
                          <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded capitalize">
                            {doc.processSlug}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                          <span>📄 {doc.fileName}</span>
                          <span>• {(doc.fileSize / 1024).toFixed(1)} KB</span>
                          <span>• {doc.pageCount} pág.</span>
                          <span>• {doc.extractedText.length} caracteres</span>
                        </div>
                        {doc.summary && (
                          <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                            "{doc.summary}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setPreviewingDoc(doc)}
                          className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          title="Ver contenido extraído"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Texto</span>
                        </button>
                        <button
                          onClick={() => handleDeletePdfDoc(doc.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                          title="Eliminar PDF"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RAG QUERY SANDBOX */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-xl p-4 text-white space-y-3">
              <div className="flex items-center justify-between border-b border-purple-800 pb-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-300" />
                  <h4 className="font-bold text-xs text-purple-100">Probador Directo RAG (PDF + Gemini 3.6 Flash)</h4>
                </div>
                <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded font-semibold">
                  Prueba de Recuperación
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-purple-200 block mb-1 font-semibold">Proceso:</label>
                  <select
                    value={ragSandboxProcess}
                    onChange={(e) => setRagSandboxProcess(e.target.value)}
                    className="w-full bg-slate-800 border border-purple-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="corte-perfileria">Corte y Perfilería</option>
                    <option value="pintura">Pintura Electrostática</option>
                    <option value="troquelado">Troquelado y Mecanizado</option>
                    <option value="vidrio-crudo-templado">Vidrio Templado</option>
                    <option value="ensamble">Ensamble Final</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-purple-200 block mb-1 font-semibold">Pregunta al Motor RAG:</label>
                  <input
                    type="text"
                    value={ragSandboxQuery}
                    onChange={(e) => setRagSandboxQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-purple-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleRunRagSandbox}
                disabled={isExecutingRagSandbox}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExecutingRagSandbox ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isExecutingRagSandbox ? 'Consultando RAG con Gemini...' : 'Ejecutar Consulta RAG con PDFs'}</span>
              </button>

              {ragSandboxResult && (
                <div className="p-3 bg-slate-950/80 rounded-lg border border-purple-800/60 text-xs space-y-2">
                  {ragSandboxResult.error ? (
                    <p className="text-rose-400 font-medium">❌ Error: {ragSandboxResult.error}</p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1">
                        <span className="text-emerald-400 font-bold">Clasificación: {ragSandboxResult.classification}</span>
                        <span className="text-purple-300 font-semibold">PDFs Consultados: {ragSandboxResult.customPdfDocsCount}</span>
                      </div>
                      <div className="text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {ragSandboxResult.reply}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SYSTEM PROMPT Y PERSONALIZACIÓN DE IA */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bot className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">System Prompt Base del Agente RAG</h3>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Instrucción del Sistema (System Prompt):
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={10}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Este prompt rige las reglas de respuesta del asistente: fidelidad a la documentación, cero alucinación y formato de respuesta.
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
          </div>
        </div>

        {/* PERSISTENCIA SUPABASE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Persistencia Supabase</h3>
                  <p className="text-[11px] text-slate-500">Almacenamiento de documentos RAG entre reinicios</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                supabaseConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                {supabaseConnected ? 'Supabase Conectado' : 'Modo Híbrido / Fallback Local'}
              </span>
            </div>

            <div>
              <button
                onClick={() => setShowSqlSchema(!showSqlSchema)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{showSqlSchema ? 'Ocultar Script SQL Supabase' : 'Ver / Copiar Script SQL de Tablas Supabase'}</span>
              </button>

              {showSqlSchema && (
                <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono space-y-2 max-h-60 overflow-y-auto">
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
      </div>

      {/* MODAL DE VISTA PREVIA DE TEXTO EXTRAÍDO DE PDF */}
      {previewingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{previewingDoc.title}</h3>
                  <p className="text-[11px] text-slate-500">
                    Archivo: {previewingDoc.fileName} • {previewingDoc.pageCount} págs • {previewingDoc.extractedText.length} caracteres extraídos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewingDoc(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-slate-200 bg-slate-900 whitespace-pre-wrap leading-relaxed">
              {previewingDoc.extractedText}
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Proceso: <strong className="capitalize text-purple-700">{previewingDoc.processSlug}</strong>
              </span>
              <button
                onClick={() => setPreviewingDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
