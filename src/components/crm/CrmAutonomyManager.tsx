'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, UserCheck, Pencil, Check, X, User } from 'lucide-react';
import { AutonomyLevelItem } from '@/src/types';
import { ProcessPicker } from './ProcessPicker';

export const CrmAutonomyManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [processName, setProcessName] = useState('');
  const [autonomy, setAutonomy] = useState<AutonomyLevelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingLevel, setSavingLevel] = useState<string | null>(null);

  const loadAutonomy = useCallback(async () => {
    if (!processSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/processes/${processSlug}`);
      const data = await res.json();
      if (data.process) {
        setProcessName(data.process.name);
        setAutonomy(data.autonomy || []);
      }
    } catch (err) {
      console.error('Error cargando matriz de autonomía:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  useEffect(() => {
    loadAutonomy();
  }, [loadAutonomy]);

  const handleSaveCollaborator = async (level: string) => {
    setSavingLevel(level);
    try {
      const res = await fetch(`/api/crm/autonomy/${processSlug}/${encodeURIComponent(level)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorName: editingName })
      });
      const data = await res.json();
      if (data.success) {
        setAutonomy(prev =>
          prev.map(item => (item.level === level ? { ...item, assignedCollaborator: data.assignedCollaborator } : item))
        );
        setEditingLevel(null);
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error guardando colaborador asignado:', err);
    } finally {
      setSavingLevel(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Administración de Autonomía</h1>
          <p className="text-xs text-slate-500 mt-0.5">Asigna el colaborador de planta responsable de cada nivel, por proceso.</p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-3">
          <UserCheck className="w-5 h-5 text-[#003366]" />
          <span>Matriz de Autonomía — {processName || '...'}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autonomy.map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="px-3 py-1 text-xs font-extrabold bg-[#003366] text-white rounded-md shadow-xs">
                    {item.level}
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">{item.role}</span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
                  <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Colaborador(es) Asignado(s)
                  </span>
                  {editingLevel === item.level ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Nombre del colaborador de planta"
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => handleSaveCollaborator(item.level)}
                        disabled={savingLevel === item.level}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingLevel(null)}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${item.assignedCollaborator ? 'font-semibold text-slate-800' : 'text-slate-400 italic'}`}>
                        {item.assignedCollaborator || 'Sin asignar todavía'}
                      </span>
                      <button
                        onClick={() => { setEditingLevel(item.level); setEditingName(item.assignedCollaborator || ''); }}
                        className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
