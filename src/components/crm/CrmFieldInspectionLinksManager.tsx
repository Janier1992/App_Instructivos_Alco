'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, Trash2, ExternalLink } from 'lucide-react';

interface Link {
  id: string;
  title: string;
  url: string;
  description: string | null;
  color: string;
}

/** Enlaces externos (formularios/tableros externos) que se abren embebidos dentro de la app. */
export const CrmFieldInspectionLinksManager: React.FC = () => {
  const [links, setLinks] = useState<Link[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/crm/field-inspection-links');
    const data = await res.json();
    if (data.success) setLinks(data.links || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/field-inspection-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, description })
      });
      const data = await res.json();
      if (data.success) {
        setTitle('');
        setUrl('');
        setDescription('');
        await load();
      } else {
        alert(data.error || 'No se pudo crear el enlace.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este enlace?')) return;
    const res = await fetch(`/api/crm/field-inspection-links/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) await load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg" />
        </div>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg" />
        <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> Agregar enlace
        </button>
      </form>

      <div className="space-y-2">
        {links.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Sin enlaces registrados.</p>
        ) : (
          links.map(link => (
            <div key={link.id} className="flex items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="min-w-0">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-bold text-sm text-[#003366] hover:underline flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 shrink-0" /> {link.title} <ExternalLink className="w-3 h-3" />
                </a>
                {link.description && <p className="text-[11px] text-slate-500 mt-0.5">{link.description}</p>}
              </div>
              <button onClick={() => handleDelete(link.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
