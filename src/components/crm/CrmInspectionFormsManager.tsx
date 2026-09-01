'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ClipboardList, Plus, Trash2, ExternalLink, Table2, Check } from 'lucide-react';
import { ProcessPicker } from './ProcessPicker';

interface InspectionForm {
  id: string;
  title: string;
  embedUrl: string;
  recordsEmbedUrl?: string;
}

/**
 * Gestión de los Formularios de Inspección de Control Calidad: título +
 * URL de "insertar código" (embed) de Microsoft Forms — no el enlace
 * normal de compartir, ese no se deja embeber en un iframe. Opcionalmente,
 * cada formulario puede tener también una URL de Vista de Registros (Excel
 * Online / SharePoint, también de "insertar código") — el aplicativo nunca
 * guarda esos registros, solo embebe la vista. La app pública los lista y
 * los abre dentro del mismo aplicativo (ver ProcessInspectionFormsPanel.tsx).
 */
export const CrmInspectionFormsManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [forms, setForms] = useState<InspectionForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [recordsEmbedUrl, setRecordsEmbedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [recordsDraft, setRecordsDraft] = useState<Record<string, string>>({});
  const [savingRecordsId, setSavingRecordsId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!processSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/inspection-forms?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) {
        setForms(data.forms || []);
        setRecordsDraft(Object.fromEntries((data.forms || []).map((f: InspectionForm) => [f.id, f.recordsEmbedUrl || ''])));
      }
    } catch (err) {
      console.error('Error cargando formularios de inspección:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!title.trim() || !embedUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/inspection-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processSlug, title, embedUrl, recordsEmbedUrl: recordsEmbedUrl || undefined, displayOrder: forms.length })
      });
      const data = await res.json();
      if (data.success) {
        setTitle('');
        setEmbedUrl('');
        setRecordsEmbedUrl('');
        load();
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error creando formulario de inspección:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este formulario de la lista?')) return;
    try {
      const res = await fetch(`/api/crm/inspection-forms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setForms(prev => prev.filter(f => f.id !== id));
      } else {
        alert(data.error || 'No se pudo eliminar.');
      }
    } catch (err) {
      console.error('Error eliminando formulario de inspección:', err);
    }
  };

  const handleSaveRecordsUrl = async (id: string) => {
    setSavingRecordsId(id);
    try {
      const res = await fetch(`/api/crm/inspection-forms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordsEmbedUrl: recordsDraft[id] || '' })
      });
      const data = await res.json();
      if (data.success) {
        setForms(prev => prev.map(f => (f.id === id ? { ...f, recordsEmbedUrl: recordsDraft[id] || undefined } : f)));
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error guardando vista de registros:', err);
    } finally {
      setSavingRecordsId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Formularios de Inspección</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Usa el enlace de <strong>"Insertar código"</strong> de Microsoft Forms (Compartir → Insertar código), no el de compartir normal — solo ese se deja abrir dentro del aplicativo. La Vista de Registros (Excel Online/SharePoint) no se puede embeber — Microsoft lo bloquea a nivel de plataforma — así que ese enlace siempre se abre en pestaña nueva; pega ahí el enlace normal de compartir del archivo.
          </p>
          <p className="text-xs text-amber-700 mt-1 font-semibold">
            ⚠️ Los formularios solo aparecen en la pestaña "Formularios" de la tarjeta pública del proceso seleccionado — verifica que diga <strong>Control Calidad</strong> antes de agregar uno.
          </p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} defaultSlug="control-calidad" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-3">
          <ClipboardList className="w-5 h-5 text-[#003366]" />
          <span>Nuevo formulario</span>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título del formulario"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
          <input
            type="url"
            value={embedUrl}
            onChange={e => setEmbedUrl(e.target.value)}
            placeholder="URL de embed del formulario (forms.office.com/Pages/ResponsePage.aspx?embed=true...)"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
          <input
            type="url"
            value={recordsEmbedUrl}
            onChange={e => setRecordsEmbedUrl(e.target.value)}
            placeholder="URL de la Vista de Registros — Excel Online/SharePoint, se abre en pestaña nueva (opcional)"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={saving || !title.trim() || !embedUrl.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#003366] hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-3">
          <span>Lista de formularios</span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : forms.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Sin formularios configurados para este proceso.</p>
        ) : (
          <div className="space-y-3">
            {forms.map(form => (
              <div key={form.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{form.title}</span>
                  <a
                    href={form.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-100 rounded-lg transition shrink-0"
                    title="Probar enlace del formulario"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="url"
                    value={recordsDraft[form.id] ?? ''}
                    onChange={e => setRecordsDraft(prev => ({ ...prev, [form.id]: e.target.value }))}
                    placeholder="URL de la Vista de Registros (Excel Online/SharePoint, opcional)"
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  />
                  <button
                    onClick={() => handleSaveRecordsUrl(form.id)}
                    disabled={savingRecordsId === form.id || (recordsDraft[form.id] ?? '') === (form.recordsEmbedUrl ?? '')}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-40 shrink-0"
                    title="Guardar URL de registros"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
