'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp, Send, RefreshCw, Check, X, AlertTriangle } from 'lucide-react';

interface ShiftCheckItem {
  id: string;
  label: string;
}

interface LatestCheck {
  shift: 'manana' | 'tarde' | 'noche';
  collaboratorName: string;
  allPassed: boolean;
  createdAt: string;
}

interface ProcessShiftCheckBoxProps {
  processSlug: string;
}

const SHIFT_LABELS: Record<'manana' | 'tarde' | 'noche', string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche'
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/**
 * Autocontrol por turno: el propio proceso deja constancia de sus controles
 * críticos, en vez de esperar a que Calidad venga a encontrar el problema
 * — el checklist lo define Calidad desde el CRM (2-5 ítems cortos por
 * proceso). Si el proceso no tiene ítems configurados, esta caja no se
 * muestra (ver return null más abajo).
 */
export const ProcessShiftCheckBox: React.FC<ProcessShiftCheckBoxProps> = ({ processSlug }) => {
  const [items, setItems] = useState<ShiftCheckItem[] | null>(null);
  const [latest, setLatest] = useState<LatestCheck | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [shift, setShift] = useState<'manana' | 'tarde' | 'noche'>('manana');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [itemsRes, latestRes] = await Promise.all([
        fetch(`/api/shift-checks/items?processSlug=${encodeURIComponent(processSlug)}`),
        fetch(`/api/shift-checks/latest?processSlug=${encodeURIComponent(processSlug)}`)
      ]);
      const itemsData = await itemsRes.json();
      const latestData = await latestRes.json();
      if (itemsData.success) {
        setItems(itemsData.items || []);
        setAnswers(Object.fromEntries((itemsData.items || []).map((i: ShiftCheckItem) => [i.id, null])));
      }
      if (latestData.success) setLatest(latestData.check);
    } catch (err) {
      console.error('Error cargando autocontrol de turno:', err);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  if (!items || items.length === 0) return null;

  const allAnswered = items.every(i => answers[i.id] !== null && answers[i.id] !== undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorName.trim() || !allAnswered) {
      setSubmitMsg('⚠️ Marca "Cumple" o "No cumple" en cada ítem y escribe tu nombre.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/shift-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          shift,
          collaboratorName,
          results: items.map(i => ({ itemId: i.id, label: i.label, passed: !!answers[i.id] })),
          notes: notes || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitMsg('✅ Autocontrol registrado. ¡Gracias por dejar constancia!');
        setCollaboratorName('');
        setNotes('');
        setAnswers(Object.fromEntries(items.map(i => [i.id, null])));
        await load();
      } else {
        setSubmitMsg(`⚠️ ${data.error || 'No se pudo registrar el autocontrol.'}`);
      }
    } catch (err) {
      setSubmitMsg('⚠️ Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-5 py-4 hover:bg-teal-50/50 transition"
      >
        <div className="flex items-center gap-2.5 text-left">
          <div className="p-2 bg-teal-100 text-teal-700 rounded-xl shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">✅ Autocontrol por Turno</h3>
            {latest ? (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {latest.allPassed ? '✅' : '⚠️'} Último: turno {SHIFT_LABELS[latest.shift].toLowerCase()}, por {latest.collaboratorName} · {timeAgo(latest.createdAt)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Todavía no hay autocontrol registrado para este proceso.</p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Confirma tú mismo, antes de que Calidad tenga que revisarlo, que estos controles se están cumpliendo en tu turno.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(['manana', 'tarde', 'noche'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                    shift === s ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {SHIFT_LABELS[s]}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-800 flex-1">{item.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [item.id]: true }))}
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border transition ${
                        answers[item.id] === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      <Check className="w-3 h-3" /> Cumple
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [item.id]: false }))}
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border transition ${
                        answers[item.id] === false ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-500 border-slate-300 hover:border-rose-400'
                      }`}
                    >
                      <X className="w-3 h-3" /> No cumple
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {Object.values(answers).some(v => v === false) && (
              <div className="flex items-start gap-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Marcaste un ítem como "No cumple" — describe qué pasó en las notas, para que quede claro qué corregir.</span>
              </div>
            )}

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas (opcional)"
              rows={2}
              maxLength={1000}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />

            <input
              type="text"
              value={collaboratorName}
              onChange={e => setCollaboratorName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={255}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-lg transition disabled:opacity-50 shrink-0"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Registrar autocontrol
              </button>
            </div>
            {submitMsg && <p className="text-[11px] text-slate-600">{submitMsg}</p>}
          </form>
        </div>
      )}
    </div>
  );
};
