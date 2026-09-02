'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  BookOpen,
  Upload,
  FileText,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { ProcessPicker } from './ProcessPicker';

interface KnowledgeDocument {
  id: string;
  processSlug: string;
  title: string;
  fileName?: string;
  markdownContent: string;
  status: 'draft' | 'published';
  pageCount?: number;
  visionPagesUsed: number;
  chunkCount: number;
  createdAt: string;
  publishedAt?: string;
}

/**
 * Base de Conocimiento: cada PDF subido aquí se convierte a Markdown —
 * texto normal más transcripción por visión de Gemini en las páginas con
 * poco texto (diagramas, tablas dibujadas, cortes de sección), que la
 * extracción de PDF plana del sistema de Documentos pierde. Calidad revisa
 * y puede editar el Markdown antes de publicarlo; solo entonces se
 * fragmenta, se embebe y el Agente de IA empieza a citarlo.
 */
export const CrmKnowledgeBaseManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  const [editMarkdown, setEditMarkdown] = useState('');
  const [saving, setSaving] = useState<'save' | 'publish' | 'unpublish' | null>(null);

  const load = useCallback(async () => {
    if (!processSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/knowledge-base?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error cargando Base de Conocimiento:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!uploadTitle.trim() || !file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('processSlug', processSlug);
      formData.append('title', uploadTitle);
      formData.append('file', file);

      const res = await fetch('/api/crm/knowledge-base', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUploadForm(false);
        await load();
        setEditing(data.document);
        setEditMarkdown(data.document.markdownContent);
      } else {
        setUploadError(data.error || 'No se pudo procesar el PDF.');
      }
    } catch (err) {
      console.error('Error subiendo documento:', err);
      setUploadError('Error de conexión. Si el PDF es muy grande, la conversión pudo exceder el tiempo máximo permitido.');
    } finally {
      setUploading(false);
    }
  };

  const openEditor = (doc: KnowledgeDocument) => {
    setEditing(doc);
    setEditMarkdown(doc.markdownContent);
  };

  const handleSave = async (action: 'save' | 'publish' | 'unpublish') => {
    if (!editing) return;
    setSaving(action);
    try {
      const body: Record<string, unknown> = {};
      if (action !== 'unpublish') body.markdownContent = editMarkdown;
      if (action === 'publish') body.publish = true;
      if (action === 'unpublish') body.unpublish = true;

      const res = await fetch(`/api/crm/knowledge-base/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setEditing(data.document);
        setEditMarkdown(data.document.markdownContent);
        await load();
        if (action === 'save') alert('Guardado como borrador.');
        if (action === 'publish') alert('Publicado — el Agente de IA ya puede citarlo.');
        if (action === 'unpublish') alert('Despublicado — el Agente de IA ya no lo usa.');
      } else {
        alert(data.error || 'No se pudo completar la acción.');
      }
    } catch (err) {
      console.error('Error guardando documento:', err);
      alert('Error de conexión.');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este documento definitivamente? Se borra el PDF original y su índice de búsqueda.')) return;
    try {
      const res = await fetch(`/api/crm/knowledge-base/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (editing?.id === id) setEditing(null);
      } else {
        alert(data.error || 'No se pudo eliminar.');
      }
    } catch (err) {
      console.error('Error eliminando documento:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Base de Conocimiento</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sube un PDF y se convierte a Markdown (texto + visión de Gemini en páginas con diagramas/tablas) — revisa y publica antes de que el agente lo use.
          </p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#003366]" />
            Documentos
          </span>
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              disabled={!processSlug}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {showUploadForm ? <X className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
              {showUploadForm ? 'Cancelar' : 'Subir PDF'}
            </button>
          </div>
        </div>

        {showUploadForm && (
          <form onSubmit={handleUpload} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <input
              type="text"
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              placeholder="Título del documento"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#003366] file:text-white file:text-xs file:font-bold"
            />
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                Convirtiendo a Markdown — en documentos largos con muchos diagramas esto puede tardar varios minutos, no cierres esta pestaña.
              </div>
            )}
            {uploadError && (
              <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {uploadError}
              </p>
            )}
            <button
              type="submit"
              disabled={uploading || !uploadTitle.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
            >
              {uploading ? 'Procesando...' : 'Convertir y crear borrador'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-8">
            {processSlug ? 'Sin documentos para este proceso.' : 'Elige un proceso para ver sus documentos.'}
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 truncate">{doc.title}</span>
                    {doc.status === 'published' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3" /> Publicado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                        <EyeOff className="w-3 h-3" /> Borrador
                      </span>
                    )}
                    {doc.visionPagesUsed > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" /> {doc.visionPagesUsed} pág. por visión
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {doc.pageCount ? `${doc.pageCount} páginas · ` : ''}{doc.chunkCount} fragmentos indexados
                  </span>
                </div>
                <button
                  onClick={() => openEditor(doc)}
                  className="px-3 py-1.5 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition shrink-0"
                >
                  Revisar
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-4 sm:my-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{editing.title}</h3>
                <p className="text-[11px] text-slate-500">
                  {editing.status === 'published' ? 'Publicado — el agente ya lo cita' : 'Borrador — revisa antes de publicar'}
                  {editing.visionPagesUsed > 0 && ` · ${editing.visionPagesUsed} páginas transcritas por visión`}
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Revisa especialmente los valores dimensionales de páginas con diagramas — la transcripción por visión puede leer mal un número. Corrige aquí antes de publicar.
              </p>
              <textarea
                value={editMarkdown}
                onChange={e => setEditMarkdown(e.target.value)}
                rows={20}
                className="w-full px-3 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => handleSave('save')}
                disabled={saving !== null}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
              >
                {saving === 'save' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar borrador
              </button>
              <div className="flex items-center gap-2">
                {editing.status === 'published' && (
                  <button
                    onClick={() => handleSave('unpublish')}
                    disabled={saving !== null}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition disabled:opacity-50"
                  >
                    {saving === 'unpublish' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Despublicar
                  </button>
                )}
                <button
                  onClick={() => handleSave('publish')}
                  disabled={saving !== null}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                >
                  {saving === 'publish' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  {editing.status === 'published' ? 'Guardar y republicar' : 'Guardar y publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
