'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send, Trash2, ImagePlus, RefreshCw, MessageSquare, Check, AlertTriangle } from 'lucide-react';

type QualityTaskStatus = 'pendiente' | 'en_progreso' | 'hecha';

interface QualityTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  status: QualityTaskStatus;
  dueDate?: string;
}

interface TaskComment {
  id: string;
  authorName: string;
  commentText: string;
  createdAt: string;
}

interface TaskAttachment {
  id: string;
  fileName: string;
  fileSize: number | null;
}

interface TaskDetailModalProps {
  task: QualityTask;
  assigneeOptions: string[];
  onClose: () => void;
  onUpdated: (task: QualityTask) => void;
  onDeleted: (id: string) => void;
}

const STATUS_OPTIONS: { value: QualityTaskStatus; label: string; className: string }[] = [
  { value: 'pendiente', label: 'Pendiente', className: 'bg-slate-200 text-slate-800' },
  { value: 'en_progreso', label: 'En Progreso', className: 'bg-amber-200 text-amber-900' },
  { value: 'hecha', label: 'Hecha', className: 'bg-emerald-200 text-emerald-900' }
];

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/** Reescala/recomprime la imagen a JPEG si supera el límite de 3 MB, en vez de solo rechazarla. */
function compressImageIfNeeded(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.size <= MAX_BYTES) {
      resolve(file);
      return;
    }
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
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))), 'image/jpeg', JPEG_QUALITY);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Vista detallada de una tarea del tablero de Calidad, estilo Trello: se
 * abre al hacer clic en una tarjeta. Permite cambiar título, descripción,
 * estado, responsable y fecha límite, además de comentarios e imágenes
 * adjuntas (máx. 3 MB, se recomprimen automáticamente si pesan más).
 */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, assigneeOptions, onClose, onUpdated, onDeleted }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assignee, setAssignee] = useState(task.assignee || '');
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [attachments, setAttachments] = useState<TaskAttachment[] | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/quality-tasks/${task.id}/comments`);
      const data = await res.json();
      if (data.success) setComments(data.comments || []);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
    }
  }, [task.id]);

  const loadAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/quality-tasks/${task.id}/attachments`);
      const data = await res.json();
      if (data.success) setAttachments(data.attachments || []);
    } catch (err) {
      console.error('Error cargando adjuntos:', err);
    }
  }, [task.id]);

  useEffect(() => {
    loadComments();
    loadAttachments();
  }, [loadComments, loadAttachments]);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/quality-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, assignee, status, dueDate: dueDate || null })
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...task, title, description, assignee, status, dueDate: dueDate || undefined });
        setDirty(false);
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error guardando tarea:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('¿Eliminar esta tarea? Se borran también sus comentarios y adjuntos.')) return;
    try {
      await fetch(`/api/quality-tasks/${task.id}`, { method: 'DELETE' });
      onDeleted(task.id);
      onClose();
    } catch (err) {
      console.error('Error eliminando tarea:', err);
    }
  };

  const handlePostComment = async () => {
    if (!commentAuthor.trim() || !newCommentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/quality-tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: commentAuthor, commentText: newCommentText })
      });
      const data = await res.json();
      if (data.success) {
        setNewCommentText('');
        loadComments();
      } else {
        alert(data.error || 'No se pudo publicar el comentario.');
      }
    } catch (err) {
      console.error('Error publicando comentario:', err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadingImage(true);
    try {
      const blob = await compressImageIfNeeded(file);
      if (blob.size > MAX_BYTES) {
        setUploadError('La imagen sigue pesando más de 3 MB incluso comprimida.');
        return;
      }
      const formData = new FormData();
      formData.append('file', blob, file.name);
      const res = await fetch(`/api/quality-tasks/${task.id}/attachments`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        loadAttachments();
      } else {
        setUploadError(data.error || 'No se pudo subir la imagen.');
      }
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      setUploadError('No se pudo procesar la imagen.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await fetch(`/api/quality-tasks/${task.id}/attachments/${attachmentId}`, { method: 'DELETE' });
      loadAttachments();
    } catch (err) {
      console.error('Error eliminando adjunto:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4 sm:my-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); markDirty(); }}
            className="flex-1 text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366] rounded-lg px-1 -mx-1"
          />
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); markDirty(); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${
                  status === opt.value ? opt.className : 'bg-white text-slate-500 border border-slate-300 hover:border-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Responsable</label>
              <input
                list="task-assignee-options"
                value={assignee}
                onChange={e => { setAssignee(e.target.value); markDirty(); }}
                placeholder="Nombre del responsable"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
              <datalist id="task-assignee-options">
                {assigneeOptions.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => { setDueDate(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); markDirty(); }}
              rows={3}
              placeholder="Detalles de la tarea (opcional)"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] resize-none"
            />
          </div>

          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Guardar cambios
            </button>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adjuntos (imágenes, máx. 3 MB)</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-1 text-[11px] font-bold text-[#003366] hover:underline disabled:opacity-50"
              >
                {uploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                Agregar imagen
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
            </div>

            {uploadError && (
              <p className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
              </p>
            )}

            {attachments === null ? (
              <p className="text-[11px] text-slate-400">Cargando...</p>
            ) : attachments.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Sin imágenes adjuntas.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <a href={`/api/quality-tasks/${task.id}/attachments/${att.id}/file`} target="_blank" rel="noopener noreferrer">
                      <img
                        src={`/api/quality-tasks/${task.id}/attachments/${att.id}/file`}
                        alt={att.fileName}
                        className="w-full h-20 object-cover"
                      />
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-rose-100 text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">
                      {formatBytes(att.fileSize)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Comentarios
            </label>

            {comments === null ? (
              <p className="text-[11px] text-slate-400">Cargando...</p>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Sin comentarios todavía.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {comments.map(c => (
                  <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-800">{c.authorName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line">{c.commentText}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={commentAuthor}
                onChange={e => setCommentAuthor(e.target.value)}
                placeholder="Tu nombre"
                className="sm:w-40 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
              <input
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder="Escribe un comentario..."
                onKeyDown={e => { if (e.key === 'Enter') handlePostComment(); }}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
              <button
                onClick={handlePostComment}
                disabled={postingComment || !commentAuthor.trim() || !newCommentText.trim()}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={handleDeleteTask}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar tarea
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
