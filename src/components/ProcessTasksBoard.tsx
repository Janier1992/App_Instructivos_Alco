'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2, User, CalendarDays, RefreshCw, LayoutGrid } from 'lucide-react';

type QualityTaskStatus = 'pendiente' | 'en_progreso' | 'hecha';

interface QualityTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  status: QualityTaskStatus;
  dueDate?: string;
}

interface ProcessTasksBoardProps {
  processSlug: string;
}

const COLUMNS: { status: QualityTaskStatus; label: string; className: string }[] = [
  { status: 'pendiente', label: 'Pendiente', className: 'bg-slate-100 border-slate-300' },
  { status: 'en_progreso', label: 'En Progreso', className: 'bg-amber-50 border-amber-300' },
  { status: 'hecha', label: 'Hecha', className: 'bg-emerald-50 border-emerald-300' }
];

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate + 'T23:59:59') < new Date();
}

const EMPTY_DRAFT = { title: '', description: '', assignee: '', dueDate: '' };

/**
 * Tablero Kanban de tareas del equipo de Calidad — arrastrar una tarjeta
 * entre columnas cambia su estado. Sin cuenta de usuario, igual que el
 * resto de la tarjeta pública de Control Calidad.
 */
export const ProcessTasksBoard: React.FC<ProcessTasksBoardProps> = ({ processSlug }) => {
  const [tasks, setTasks] = useState<QualityTask[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<QualityTaskStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/quality-tasks?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error cargando tareas de Calidad:', err);
      setTasks([]);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quality-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          title: draft.title,
          description: draft.description || undefined,
          assignee: draft.assignee || undefined,
          dueDate: draft.dueDate || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setDraft(EMPTY_DRAFT);
        setShowForm(false);
        await load();
      } else {
        alert(data.error || 'No se pudo crear la tarea.');
      }
    } catch (err) {
      console.error('Error creando tarea de Calidad:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    setTasks(prev => (prev ? prev.filter(t => t.id !== id) : prev));
    try {
      await fetch(`/api/quality-tasks/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error eliminando tarea de Calidad:', err);
      load();
    }
  };

  const handleDrop = async (status: QualityTaskStatus, taskId: string) => {
    setDragOverStatus(null);
    setTasks(prev => (prev ? prev.map(t => (t.id === taskId ? { ...t, status } : t)) : prev));
    try {
      const res = await fetch(`/api/quality-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!data.success) load();
    } catch (err) {
      console.error('Error moviendo tarea de Calidad:', err);
      load();
    }
  };

  if (tasks === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando tablero de tareas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-[#003366]" />
          <h3 className="font-bold text-slate-900 text-sm">Tareas de Calidad</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-700 rounded-lg transition"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancelar' : 'Nueva tarea'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 shadow-sm">
          <input
            type="text"
            value={draft.title}
            onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Título de la tarea"
            maxLength={255}
            autoFocus
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
          <textarea
            value={draft.description}
            onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] resize-none"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={draft.assignee}
              onChange={e => setDraft(prev => ({ ...prev, assignee: e.target.value }))}
              placeholder="Responsable (opcional)"
              className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
            <input
              type="date"
              value={draft.dueDate}
              onChange={e => setDraft(prev => ({ ...prev, dueDate: e.target.value }))}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !draft.title.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
            >
              Crear tarea
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status);
          return (
            <div
              key={col.status}
              onDragOver={e => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus(prev => (prev === col.status ? null : prev))}
              onDrop={e => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) handleDrop(col.status, taskId);
              }}
              className={`rounded-xl border-2 border-dashed p-3 space-y-2 min-h-[10rem] transition ${
                dragOverStatus === col.status ? 'border-blue-400 bg-blue-50/50' : col.className
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">{col.label}</span>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                  {colTasks.length}
                </span>
              </div>

              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', task.id)}
                  className="bg-white rounded-lg border border-slate-200 p-3 space-y-1.5 shadow-sm cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 flex-1">{task.title}</p>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition shrink-0"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {task.description && <p className="text-[11px] text-slate-600 whitespace-pre-line">{task.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {task.assignee && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                        <User className="w-3 h-3" /> {task.assignee}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 text-[10px] font-semibold ${isOverdue(task.dueDate) && task.status !== 'hecha' ? 'text-rose-600' : 'text-slate-500'}`}>
                        <CalendarDays className="w-3 h-3" />
                        {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {colTasks.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-4">Sin tareas</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
