'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Send, RefreshCw } from 'lucide-react';

interface Comment {
  id: string;
  authorName: string;
  commentText: string;
  createdAt: string;
}

interface PublicationCommentsProps {
  circularId: string;
}

/**
 * Comentarios de gestión sobre una publicación de Principal. Sin cuenta de
 * usuario: cualquiera comenta dando su nombre, pero el comentario no
 * aparece aquí hasta que un Administrador lo aprueba desde /crm/comentarios.
 */
export const PublicationComments: React.FC<PublicationCommentsProps> = ({ circularId }) => {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/circulares/${circularId}/comments`);
      const data = await res.json();
      if (data.success) setComments(data.comments || []);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
    }
  }, [circularId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !commentText.trim()) {
      setSubmitMsg('⚠️ Completa tu nombre y el comentario.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch(`/api/circulares/${circularId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, commentText })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitMsg('✅ ' + data.message);
        setCommentText('');
      } else {
        setSubmitMsg(`⚠️ ${data.error || 'No se pudo enviar el comentario.'}`);
      }
    } catch (err) {
      setSubmitMsg('⚠️ Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-bold text-[#003366] hover:underline"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Comentarios ({comments.length})
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400">Aún no hay comentarios en esta publicación.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">{c.authorName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{c.commentText}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2 pt-1">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe un comentario de gestión sobre esta publicación..."
              rows={2}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-400">Tu comentario se publica tras ser aprobado.</p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white font-bold text-[11px] rounded-lg transition disabled:opacity-50 shrink-0"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar
              </button>
            </div>
            {submitMsg && <p className="text-[11px] text-slate-600">{submitMsg}</p>}
          </form>
        </div>
      )}
    </div>
  );
};
