'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ProcessItem,
  DocumentItem,
  QualityControl,
  AcceptanceCriterion,
  AutonomyLevelItem
} from '../types';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Info,
  RefreshCw,
  User,
  Newspaper,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { ProcessDocumentsPanel } from './ProcessDocumentsPanel';
import { ProcessVideosPanel } from './ProcessVideosPanel';
import { ProcessPrincipalPanel } from './ProcessPrincipalPanel';
import { SaveOfflineButton } from './SaveOfflineButton';
import { ProcessImprovementBox } from './ProcessImprovementBox';
import { ProcessHealthBadge, ProcessHealthStats } from './ProcessHealthBadge';

interface ProcessDetailProps {
  slug: string;
}

// Flags temporales para ocultar secciones de la vista sin eliminar su
// implementación (quedan pendientes de retomar más adelante).
const SHOW_NORMATIVE_DOCS_SECTION = false;
const SHOW_PROCESS_VIDEOS_SECTION = true;

export const ProcessDetail: React.FC<ProcessDetailProps> = ({
  slug
}) => {
  const [activeTab, setActiveTab] = useState<'principal' | 'autonomia' | 'documentos'>('principal');
  const [loading, setLoading] = useState(true);
  const [ragDocsCount, setRagDocsCount] = useState(0);
  const [healthStats, setHealthStats] = useState<ProcessHealthStats | undefined>(undefined);
  const [certifiedTeam, setCertifiedTeam] = useState<{ name: string; level: 'U' | 'O' }[]>([]);
  const [data, setData] = useState<{
    process: ProcessItem;
    documents: DocumentItem[];
    controls: QualityControl[];
    criteria: AcceptanceCriterion[];
    autonomy: AutonomyLevelItem[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/processes/${slug}`)
      .then(res => res.json())
      .then(resData => {
        if (isMounted && resData.process) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error cargando detalle del proceso:', err);
        if (isMounted) setLoading(false);
      });

    // Documentos PDF cargados al motor RAG para este proceso — el conteo del
    // tab "Documentación del Proceso" debe reflejar el total real (estáticos +
    // PDFs subidos), no solo la documentación estática.
    fetch(`/api/rag/documents?processSlug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(resData => {
        if (isMounted && resData.success) {
          setRagDocsCount(resData.total || 0);
        }
      })
      .catch(err => console.error('Error cargando conteo de documentos RAG:', err));

    // Semáforo de salud del proceso ("andon" digital) — % resuelto sin
    // escalar en los últimos 30 días.
    fetch(`/api/process-health?processSlug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(resData => {
        if (isMounted && resData.success) {
          setHealthStats(resData.stats?.[0]);
        }
      })
      .catch(err => console.error('Error cargando salud del proceso:', err));

    // Equipo certificado (nivel U/O del marco ILUO) — reconocimiento
    // público de quiénes ya están capacitados para trabajar sin supervisión
    // en este proceso.
    fetch(`/api/competencies?processSlug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(resData => {
        if (isMounted && resData.success) {
          setCertifiedTeam(resData.certified || []);
        }
      })
      .catch(err => console.error('Error cargando equipo certificado:', err));

    return () => { isMounted = false; };
  }, [slug]);

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#003366] animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Cargando estándar de calidad...</p>
      </div>
    );
  }

  const { process, documents, controls, criteria, autonomy } = data;
  // Algunos procesos (ej. Instalación, equipo externo) no llevan Matriz de
  // Autonomía — por defecto todos la tienen salvo que se indique lo contrario.
  const showAutonomyTab = process.showAutonomyTab !== false;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Botón Volver & Header del Proceso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            id="back-to-processes-btn"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#003366]">
                {process.name}
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md uppercase">
                Vigente
              </span>
              <ProcessHealthBadge stats={healthStats} />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {process.department} • Vigencia: {process.effectiveDate}
            </p>
          </div>
        </div>

        <SaveOfflineButton processSlug={slug} />
      </div>

      {/* Navegación por Tabs de Proceso Exclusivamente Solicitados */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('principal')}
          id="tab-principal"
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap rounded-t-xl transition-colors border-b-2 min-h-[44px] ${
            activeTab === 'principal'
              ? 'border-[#003366] text-[#003366] bg-blue-50/80 shadow-xs font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Newspaper className="w-4 h-4 text-[#003366] shrink-0" />
          <span>Principal</span>
        </button>

        <button
          onClick={() => setActiveTab('documentos')}
          id="tab-documentos"
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap rounded-t-lg transition-colors border-b-2 min-h-[44px] ${
            activeTab === 'documentos'
              ? 'border-[#003366] text-[#003366] bg-blue-50/80 shadow-xs font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 text-[#003366] shrink-0" />
          <span>Documentación del Proceso ({ragDocsCount})</span>
        </button>

        {showAutonomyTab && (
          <button
            onClick={() => setActiveTab('autonomia')}
            id="tab-autonomia"
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap rounded-t-xl transition-colors border-b-2 min-h-[44px] ${
              activeTab === 'autonomia'
                ? 'border-[#003366] text-[#003366] bg-blue-50/80 shadow-xs font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-[#003366] shrink-0" />
            <span>Matriz de Autonomía</span>
          </button>
        )}
      </div>

      {/* MODULO 0: PRINCIPAL — vista informativa por defecto de la sección */}
      {activeTab === 'principal' && <ProcessPrincipalPanel processSlug={slug} />}

      {/* MODULO 1: MATRIZ DE AUTONOMÍA */}
      {activeTab === 'autonomia' && showAutonomyTab && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-[#003366] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#003366]" />
                Matriz de Autonomía Alco (Nivel 1 a Nivel 4)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define las atribuciones y límites de decisión autorizados por rol para el proceso de {process.name}.
              </p>
            </div>
          </div>

          {certifiedTeam.length > 0 && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Equipo Certificado en este Proceso
              </span>
              <div className="flex flex-wrap gap-2">
                {certifiedTeam.map((member, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 px-2.5 py-1 rounded-full"
                    title={member.level === 'O' ? 'Experto — puede entrenar a otros' : 'Capacitado — trabaja sin supervisión'}
                  >
                    {member.level === 'O' ? '⭐' : '✓'} {member.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autonomy.map((item, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3 flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="px-3 py-1 text-xs font-extrabold bg-[#003366] text-white rounded-md shadow-xs">
                      {item.level}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">{item.role}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-600 italic">"{item.scope}"</p>

                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
                    <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Colaborador(es) Asignado(s)
                    </span>
                    <span className={`text-xs block ${item.assignedCollaborator ? 'font-semibold text-slate-800' : 'text-slate-400 italic'}`}>
                      {item.assignedCollaborator || 'Sin asignar todavía'}
                    </span>
                  </div>

                  <div className="pt-2 space-y-1">
                    <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider block">Acciones Autorizadas:</span>
                    <ul className="text-xs text-slate-700 space-y-1">
                      {item.allowedActions.map((act, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 bg-amber-50/70 p-3 rounded-lg border border-amber-200 space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 uppercase">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Condición de Escalamiento
                  </span>
                  <p className="text-xs text-amber-900 font-medium">{item.escalationCondition}</p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Contacto: <strong>{item.contactPerson}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULO 2: DOCUMENTACIÓN DEL PROCESO */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-[#003366] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#003366]" />
                Documentación del Proceso
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Infografías oficiales, instructivos, fichas técnicas y criterios de calidad vigentes para {process.name}.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 rounded-lg shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Documentación Oficial Activa
            </span>
          </div>

          {/* Ficha Resumen de Infografía Oficial */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-[#003366]" />
                {process.infographicTitle}
              </h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {process.infographicSummary}
            </p>
            {process.keyAspects.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-[#003366] uppercase tracking-wider block mb-1">
                  Controles Críticos de la Infografía:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {process.keyAspects.map((aspect, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#003366] shrink-0" />
                      <span>{aspect}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Criterios de Aceptación y Rechazo Incluidos */}
          {criteria.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-[#003366] uppercase tracking-wider">
                Criterios de Inspección y Aceptación/Rechazo
              </h4>
              <div className="space-y-3">
                {criteria.map((c, idx) => (
                  <div key={c.id || idx} className="rounded-xl border border-slate-200 overflow-hidden text-xs shadow-2xs">
                    <div className="bg-[#003366] text-white px-4 py-2 font-bold flex items-center justify-between">
                      <span>Parámetro: {c.parameter}</span>
                      {c.isDynamic ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-200 bg-emerald-900/40 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3" /> Agregado por Calidad
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-mono">Ref: {c.controlId}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
                      <div className="p-3 bg-emerald-50/30">
                        <span className="font-bold text-emerald-800 block mb-1">✓ Criterio de Aceptación:</span>
                        <p className="text-slate-800">{c.acceptance}</p>
                      </div>
                      <div className="p-3 bg-rose-50/30">
                        <span className="font-bold text-rose-800 block mb-1">✕ Criterio de Rechazo:</span>
                        <p className="text-slate-800">{c.rejection}</p>
                      </div>
                      <div className="p-3 bg-amber-50/30">
                        <span className="font-bold text-amber-900 block mb-1">⚠ Acción Requerida:</span>
                        <p className="text-slate-800">{c.requiredAction}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listado de Documentos del Proceso (oculto temporalmente, ver SHOW_NORMATIVE_DOCS_SECTION) */}
          {SHOW_NORMATIVE_DOCS_SECTION && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-[#003366] uppercase tracking-wider">
                Documentos Normativos Oficiales
              </h4>
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-5 rounded-xl border transition-all ${
                      doc.status === 'vigente'
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-2xs'
                        : 'border-slate-200 bg-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-5 h-5 ${doc.status === 'vigente' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-600">{doc.code}</span>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md uppercase ${
                          doc.status === 'vigente'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {doc.version} - {doc.status}
                        </span>
                      </div>
                    </div>

                    <div className="py-3 text-xs text-slate-700 space-y-2 whitespace-pre-line font-mono bg-white p-4 rounded-lg border border-slate-200 mt-3">
                      {doc.contentText}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Autor: {doc.owner}</span>
                      <span>Aprobado por: {doc.approvedBy}</span>
                      <span>Vigencia: {doc.effectiveDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* Buzón de mejora digital ("Kaizen") de este proceso */}
          <ProcessImprovementBox processSlug={slug} criteriaParameters={criteria.map(c => c.parameter)} />

          {/* Documentos PDF cargados por el usuario para este proceso, con indexación RAG */}
          <ProcessDocumentsPanel processSlug={slug} />

          {/* Videos explicativos de operaciones de este proceso (oculto temporalmente, ver SHOW_PROCESS_VIDEOS_SECTION) */}
          {SHOW_PROCESS_VIDEOS_SECTION && <ProcessVideosPanel processSlug={slug} />}
        </div>
      )}
    </div>
  );
};
