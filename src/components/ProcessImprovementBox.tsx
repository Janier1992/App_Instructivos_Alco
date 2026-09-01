'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Send, RefreshCw, Clock, Eye, CheckCircle2 } from 'lucide-react';

type ImprovementStatus = 'proposed' | 'in_review' | 'implemented' | 'rejected';

interface Improvement {
  id: string;
  title: string;
  description: string;
  relatedCriterion: string | null;
  authorName: string | null;
  status: ImprovementStatus;
  createdAt: string;
  reviewedAt: string | null;
}

/** A partir de este número de días sin que Calidad la toque, se resalta como pendiente hace rato — la evidencia de sistemas de sugerencias muestra que la participación cae fuerte cuando una idea queda sin respuesta visible. */
const STALE_DAYS_THRESHOLD = 7;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

interface ProcessImprovementBoxProps {
  processSlug: string;
  /** Nombres de los parámetros de Criterios de Aceptación/Rechazo de este proceso, para dar contexto a la propuesta. */
  criteriaParameters: string[];
}

const STATUS_META: Record<ImprovementStatus, { label: string; icon: React.ElementType; className: string }> = {
  proposed: { label: 'Propuesta', icon: Clock, className: 'bg-slate-100 text-slate-700 border-slate-300' },
  in_review: { label: 'En revisión', icon: Eye, className: 'bg-amber-100 text-amber-800 border-amber-300' },
  implemented: { label: 'Implementada', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: 'No procede', icon: Clock, className: 'bg-slate-100 text-slate-500 border-slate-300' }
};

const GENERAL_OPTION = 'General del proceso';

/**
 * Buzón de mejora digital ("Kaizen") de este proceso: cualquier colaborador
 * propone una mejora a un criterio puntual o al proceso en general, sin
 * cuenta de usuario. Calidad revisa y cambia el estado desde el CRM — el
 * colaborador ve aquí mismo si su idea avanzó, lo que sostiene el
 * compromiso mucho mejor que pedirlo en abstracto.
 */
export const ProcessImprovementBox: React.FC<ProcessImprovementBoxProps> = ({ processSlug, criteriaParameters }) => {
  const [expanded, setExpanded] = useState(false);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [relatedCriterion, setRelatedCriterion] = useState(GENERAL_OPTION);
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const loadImprovements = useCallback(async () => {
    try {
      const res = await fetch(`/api/improvements?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setImprovements(data.improvements || []);
    } catch (err) {
      console.error('Error cargando propuestas de mejora:', err);
    }
  }, [processSlug]);

  useEffect(() => {
    loadImprovements();
  }, [loadImprovements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setSubmitMsg('⚠️ Completa el título y la descripción de tu idea.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug,
          title,
          description,
          relatedCriterion: relatedCriterion === GENERAL_OPTION ? undefined : relatedCriterion,
          authorName: authorName || undefined
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitMsg('✅ ' + data.message);
        setTitle('');
        setDescription('');
        setRelatedCriterion(GENERAL_OPTION);
        await loadImprovements();
      } else {
        setSubmitMsg(`⚠️ ${data.error || 'No se pudo enviar tu propuesta.'}`);
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
        className="w-full flex items-center justify-between gap-2 px-5 py-4 hover:bg-amber-50/50 transition"
      >
        <div className="flex items-center gap-2.5 text-left">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">💡 Buzón de Mejora</h3>
            <p className="text-xs text-slate-500">
              ¿Se te ocurre cómo mejorar un criterio o este proceso? Cuéntanoslo — {improvements.length} propuesta{improvements.length !== 1 ? 's' : ''} hasta ahora
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {improvements.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {improvements.map((imp) => {
                const meta = STATUS_META[imp.status];
                const StatusIcon = meta.icon;
                const pendingDays = imp.status === 'proposed' && !imp.reviewedAt ? daysSince(imp.createdAt) : null;
                const isStale = pendingDays !== null && pendingDays >= STALE_DAYS_THRESHOLD;
                return (
                  <div key={imp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{imp.title}</p>
                        {imp.relatedCriterion && (
                          <p className="text-[10px] text-slate-500 mt-0.5">Sobre: {imp.relatedCriterion}</p>
                        )}
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${meta.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap">{imp.description}</p>
                    <div className="flex items-center justify-between mt-1.5 flex-wrap gap-1">
                      <span className="text-[10px] text-slate-400">
                        {imp.authorName || 'Anónimo'} · {new Date(imp.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {pendingDays !== null && (
                        <span className={`text-[10px] font-semibold ${isStale ? 'text-amber-700' : 'text-slate-400'}`}>
                          {pendingDays === 0 ? 'Enviada hoy' : `Hace ${pendingDays} día${pendingDays === 1 ? '' : 's'}, esperando revisión`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5 pt-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título breve de tu idea"
              maxLength={200}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {criteriaParameters.length > 0 && (
              <select
                value={relatedCriterion}
                onChange={(e) => setRelatedCriterion(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value={GENERAL_OPTION}>{GENERAL_OPTION}</option>
                {criteriaParameters.map((param) => (
                  <option key={param} value={param}>{param}</option>
                ))}
              </select>
            )}

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu propuesta: ¿qué cambiarías y por qué?"
              rows={3}
              maxLength={2000}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />

            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Tu nombre (opcional, para poder reconocer tu aporte)"
              maxLength={255}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-400">Calidad revisa cada propuesta y le da seguimiento aquí mismo.</p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg transition disabled:opacity-50 shrink-0"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar idea
              </button>
            </div>
            {submitMsg && <p className="text-[11px] text-slate-600">{submitMsg}</p>}
          </form>
        </div>
      )}
    </div>
  );
};
