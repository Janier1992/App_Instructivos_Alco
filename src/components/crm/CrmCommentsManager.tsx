'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, X, Clock, MessageSquare, AlertCircle, Trash2 } from 'lucide-react';
import { useCrmSession } from './CrmSessionContext';

interface CommentAdmin {
  id: string;
  circularId: string;
  circularTitle: string;
  authorName: string;
  commentText: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/** Moderación de comentarios de las publicaciones de Principal: aprobar o rechazar antes de que se vean públicamente. */
export const CrmCommentsManager: React.FC = () => {
  const { role } = useCrmSession();
  const [comments, setComments] = useState<CommentAdmin[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/comments');
      const data = await res.json();
      if (data.success) setComments(data.comments || []);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/crm/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        await loadComments();
      } else {
        alert(data.error || 'No se pudo actualizar el comentario.');
      }
    } catch (err) {
      console.error('Error moderando comentario:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este comentario definitivamente? Ya no se podrá recuperar.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/crm/comments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadComments();
      } else {
        alert(data.error || 'No se pudo eliminar el comentario.');
      }
    } catch (err) {
      console.error('Error eliminando comentario:', err);
    } finally {
      setBusyId(null);
    }
  };

  const pending = comments.filter((c) => c.status === 'pending');
  const reviewed = comments.filter((c) => c.status !== 'pending');

  const statusBadge = (status: CommentAdmin['status']) => {
    if (status === 'approved') return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-emerald-100 text-emerald-800">Aprobado</span>;
    if (status === 'rejected') return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-rose-100 text-rose-700">Rechazado</span>;
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-amber-100 text-amber-800">Pendiente</span>;
  };

  const CommentRow = ({ c }: { c: CommentAdmin }) => (
    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">{c.authorName}</span>
            {statusBadge(c.status)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            en <span className="font-semibold text-slate-600">{c.circularTitle}</span> · {new Date(c.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap">{c.commentText}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {c.status === 'pending' && (
            <>
              <button
                onClick={() => handleReview(c.id, 'approved')}
                disabled={busyId === c.id}
                title="Aprobar"
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleReview(c.id, 'rejected')}
                disabled={busyId === c.id}
                title="Rechazar"
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {role === 'administrador' && (
            <button
              onClick={() => handleDelete(c.id)}
              disabled={busyId === c.id}
              title="Eliminar definitivamente"
              className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-lg transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Comentarios</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Un comentario nuevo queda oculto hasta que lo apruebes — solo entonces se ve en la publicación correspondiente.
          </p>
        </div>
        <button onClick={loadComments} className="text-xs font-semibold text-[#003366] hover:underline flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Clock className="w-4 h-4 text-amber-600" />
          Pendientes ({pending.length})
        </div>
        {pending.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500">No hay comentarios pendientes de aprobar.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pending.map((c) => <CommentRow key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            Ya revisados ({reviewed.length})
          </div>
          <div className="space-y-2.5">
            {reviewed.map((c) => <CommentRow key={c.id} c={c} />)}
          </div>
        </div>
      )}
    </div>
  );
};
