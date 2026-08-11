import * as pdfParseModule from 'pdf-parse';
import { getSupabaseClient } from './supabaseService';
import { PROCESSES } from '../data/processesData';

// Fallback compatible import for ESM/CJS build
const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

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
}

// Memory store for loaded RAG PDFs
let customDocumentsStore: CustomRagDocument[] = [
  {
    id: 'pdf-default-01',
    fileName: 'Manual_Tecnico_Control_Calidad_Alco_2026.pdf',
    fileSize: 485200,
    processSlug: 'corte-perfileria',
    title: 'Manual Técnico de Tolerancias en Corte y Extrusión',
    code: 'PDF-TC-01',
    uploadedAt: new Date().toISOString(),
    extractedText: `MANUAL TÉCNICO DE CONTROL DE CALIDAD - CORTE Y EXTRUSIÓN ALCO S.A.S.
1. TOLERANCIAS Y ESPECIFICACIONES DIMENSIONALES EN CORTE
- Tolerancia longitudinal en tronzadora: ± 0.3 mm para líneas de alta gama (Alumak y Panorama) y ± 0.5 mm para líneas estándar.
- Inclinación máxima de inglete: 45° ± 0.15° en ensambles estructurales.
- Desahogo de condensación: Mínimo 2 perfiles de drenaje por cada metro lineal de alfardía.
- Flecha o curvatura máxima aceptada en perfiles de 6 metros: 0.8 mm por metro.
- Defecto critico: Rayas transversales con profundidad mayor a 20 micras en cara vista requieren descarte inmediato.
2. PROCEDIMIENTO DE ESCALAMIENTO Y AUDITORÍA
Cualquier desviación en la medición del ángulo mayor a 0.5° genera paro de máquina e inspección de calibración de disco de corte.`,
    pageCount: 3,
    chunkCount: 2,
    summary: 'Manual oficial de tolerancias dimensionales en tronzadoras y extrusión para perfiles Alco.'
  }
];

export function getCustomRagDocuments(processSlug?: string): CustomRagDocument[] {
  if (!processSlug || processSlug === 'all' || processSlug === 'general') {
    return customDocumentsStore;
  }
  return customDocumentsStore.filter(doc => doc.processSlug === processSlug || doc.processSlug === 'general');
}

export function getAllCustomRagDocuments(): CustomRagDocument[] {
  return customDocumentsStore;
}

export async function processAndSavePdfDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number,
  processSlug: string,
  customTitle?: string
): Promise<CustomRagDocument> {
  console.log(`📄 Procesando archivo PDF para RAG: ${fileName} (${fileSize} bytes)...`);

  let textExtracted = '';
  let pageCount = 1;

  try {
    const pdfData = await pdfParse(fileBuffer);
    textExtracted = pdfData.text || '';
    pageCount = pdfData.numpages || 1;
    console.log(`✅ Texto extraído con éxito de PDF (${pdfData.numpages} páginas, ${textExtracted.length} caracteres).`);
  } catch (err: any) {
    console.warn(`⚠️ Error analizando PDF con pdf-parse, realizando extracción de fallback:`, err.message);
    // Fallback simple if PDF structure is binary text
    const rawStr = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\táéíóúÁÉÍÓÚñÑ]/g, ' ');
    textExtracted = rawStr.substring(0, 10000);
    pageCount = 1;
  }

  // Clean and trim text
  const cleanText = textExtracted.replace(/\s+/g, ' ').trim();
  const chunks = Math.ceil(cleanText.length / 800) || 1;

  const docId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const title = customTitle || fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  const code = `PDF-RAG-${Math.floor(100 + Math.random() * 900)}`;

  const newDoc: CustomRagDocument = {
    id: docId,
    fileName,
    fileSize,
    processSlug: processSlug || 'general',
    title,
    code,
    uploadedAt: new Date().toISOString(),
    extractedText: cleanText || 'Sin texto legible extraído del archivo PDF.',
    pageCount,
    chunkCount: chunks,
    summary: cleanText.substring(0, 250) + (cleanText.length > 250 ? '...' : '')
  };

  customDocumentsStore.unshift(newDoc);

  // Intentar guardar en Supabase si la tabla existe
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('rag_custom_documents').insert({
        id: newDoc.id,
        file_name: newDoc.fileName,
        file_size: newDoc.fileSize,
        process_slug: newDoc.processSlug,
        title: newDoc.title,
        code: newDoc.code,
        extracted_text: newDoc.extractedText,
        page_count: newDoc.pageCount,
        created_at: newDoc.uploadedAt
      });
      console.log('✅ Documento RAG guardado en Supabase table rag_custom_documents.');
    } catch (err) {
      console.warn('⚠️ Supabase rag_custom_documents (no crítico):', err);
    }
  }

  return newDoc;
}

export function deleteCustomRagDocument(id: string): boolean {
  const initialLength = customDocumentsStore.length;
  customDocumentsStore = customDocumentsStore.filter(doc => doc.id !== id);
  return customDocumentsStore.length < initialLength;
}

/**
 * Métricas de cobertura documental para el Dashboard de Supervisores:
 * cuántos PDFs hay cargados por proceso y qué procesos aún no tienen ninguno.
 */
export function getRagCoverageMetrics() {
  const totalDocuments = customDocumentsStore.length;

  const byProcess = PROCESSES.map(p => ({
    processSlug: p.slug,
    processName: p.name,
    documentCount: customDocumentsStore.filter(doc => doc.processSlug === p.slug).length
  })).sort((a, b) => b.documentCount - a.documentCount);

  const processesWithDocs = byProcess.filter(p => p.documentCount > 0).length;
  const processesWithoutDocs = byProcess.filter(p => p.documentCount === 0).map(p => p.processName);

  return {
    totalDocuments,
    totalProcesses: PROCESSES.length,
    processesWithDocs,
    processesWithoutDocs,
    byProcess
  };
}
