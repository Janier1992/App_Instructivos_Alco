/**
 * Tipos y constantes del documento RAG sin ninguna dependencia de Node
 * (pdf-parse, @napi-rs/canvas, etc.) — se importan tanto desde módulos de
 * servidor (customRagStore.ts) como desde componentes cliente (formulario de
 * carga del CRM, panel de documentación por proceso). Si estas constantes
 * vivieran en customRagStore.ts, cualquier componente cliente que las
 * importara arrastraría al bundle del navegador las dependencias pesadas
 * de servidor que solo se usan al procesar un PDF.
 */

/**
 * Categoría del documento, asignada por quien lo sube desde el Portal de
 * Administración — permite agrupar la lista de documentos de cada proceso
 * en carpetas en vez de una tabla plana. 'otro' es el valor por defecto para
 * documentos subidos antes de que existiera esta categorización.
 */
export type RagDocumentType = 'instructivo' | 'manual' | 'ficha_tecnica' | 'ficha_troquelado' | 'diseno' | 'otro';

export const RAG_DOCUMENT_TYPE_ORDER: RagDocumentType[] = [
  'instructivo',
  'manual',
  'ficha_tecnica',
  'ficha_troquelado',
  'diseno',
  'otro'
];

export const RAG_DOCUMENT_TYPE_LABELS: Record<RagDocumentType, string> = {
  instructivo: 'Instructivos',
  manual: 'Manuales',
  ficha_tecnica: 'Fichas Técnicas',
  ficha_troquelado: 'Fichas de Troquelado',
  diseno: 'Diseños',
  otro: 'Otros Documentos'
};

export function normalizeDocumentType(value: unknown): RagDocumentType {
  return RAG_DOCUMENT_TYPE_ORDER.includes(value as RagDocumentType) ? (value as RagDocumentType) : 'otro';
}

export interface CustomRagDocument {
  id: string;
  fileName: string;
  fileSize: number;
  processSlug: string;
  title: string;
  code: string;
  uploadedAt: string;
  extractedText: string;
  pageCount: number;
  chunkCount: number;
  summary?: string;
  documentType: RagDocumentType;
  /** Ruta en Supabase Storage del PDF original; sin esto no se puede visualizar el archivo real. */
  storagePath?: string;
}
