import { GoogleGenAI } from '@google/genai';
import { getSupabaseClient } from './supabaseService';

/**
 * Búsqueda semántica real sobre los PDFs cargados: fragmenta cada documento
 * en trozos manejables y genera embeddings con Gemini (gemini-embedding-001,
 * misma clave que ya usa el chat, cuota separada del modelo de generación).
 * Los vectores se guardan en Supabase (pgvector) y se consultan por similitud
 * coseno en vez de volcar el documento completo en cada pregunta.
 *
 * Todo aquí es "best effort": si Supabase no está configurado o cualquier
 * paso falla, se devuelve null/0 en vez de lanzar — quien llama decide caer
 * al comportamiento de respaldo (texto completo del PDF).
 */

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_BATCH_SIZE = 10;
const MAX_CHUNK_CHARS = 1000;

let embeddingClient: GoogleGenAI | null = null;

function getEmbeddingClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!embeddingClient) {
    embeddingClient = new GoogleGenAI({ apiKey });
  }
  return embeddingClient;
}

/**
 * Fragmenta un texto largo en trozos de ~MAX_CHUNK_CHARS respetando párrafos.
 * Si un párrafo individual es más largo que el límite, lo parte por oraciones.
 */
export function chunkText(text: string, maxChars: number = MAX_CHUNK_CHARS): string[] {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const source = paragraphs.length > 0 ? paragraphs : [text];

  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      chunks.push(current);
      current = '';
    }
  };

  for (const paragraph of source) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    flush();

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    // Párrafo demasiado largo: partir por oraciones
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const candidateSentence = current ? `${current} ${sentence}` : sentence;
      if (candidateSentence.length <= maxChars) {
        current = candidateSentence;
      } else {
        flush();
        current = sentence.length <= maxChars ? sentence : sentence.slice(0, maxChars);
      }
    }
  }

  flush();
  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}

/**
 * Genera embeddings para varios textos en lotes. Devuelve un arreglo del
 * mismo tamaño que `texts`, con `null` en las posiciones que fallaron.
 */
export async function embedTexts(
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
): Promise<(number[] | null)[]> {
  const client = getEmbeddingClient();
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  if (!client || texts.length === 0) return results;

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    try {
      const response = await client.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: batch,
        config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS }
      });
      (response.embeddings || []).forEach((emb, idx) => {
        results[i + idx] = emb.values || null;
      });
    } catch (err: any) {
      console.warn('⚠️ Error generando embeddings con Gemini:', err?.message || err);
    }
  }

  return results;
}

/**
 * Fragmenta el texto de un documento, genera sus embeddings y los guarda en
 * Supabase. Devuelve cuántos fragmentos quedaron indexados (0 si no hay
 * Supabase configurado o falló la generación de embeddings).
 */
export async function embedAndStoreChunks(
  documentId: string,
  processSlug: string,
  documentTitle: string,
  documentCode: string,
  text: string
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase || !text.trim()) return 0;

  const chunks = chunkText(text);
  const embeddings = await embedTexts(chunks, 'RETRIEVAL_DOCUMENT');

  const rows = chunks
    .map((content, idx) => ({
      document_id: documentId,
      process_slug: processSlug,
      document_title: documentTitle,
      document_code: documentCode,
      chunk_index: idx,
      content,
      embedding: embeddings[idx]
    }))
    .filter(row => row.embedding !== null);

  if (rows.length === 0) return 0;

  try {
    const { error } = await supabase.from('rag_document_chunks').insert(rows);
    if (error) {
      console.warn('⚠️ Error guardando fragmentos RAG en Supabase:', error.message);
      return 0;
    }
    return rows.length;
  } catch (err: any) {
    console.warn('⚠️ Error guardando fragmentos RAG:', err?.message || err);
    return 0;
  }
}

/**
 * Fragmenta y embebe el Markdown de un documento de la Base de
 * Conocimiento (knowledgeBaseStore.ts) — misma mecánica que
 * embedAndStoreChunks, pero en su propia tabla (knowledge_document_chunks)
 * para mantener ese módulo separado del sistema de Documentos actual.
 * Borra primero los fragmentos previos del documento, así que es seguro
 * llamarla de nuevo al republicar una edición.
 */
export async function embedAndStoreKnowledgeChunks(
  documentId: string,
  processSlug: string,
  documentTitle: string,
  markdown: string
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase || !markdown.trim()) return 0;

  await supabase.from('knowledge_document_chunks').delete().eq('document_id', documentId);

  const chunks = chunkText(markdown);
  const embeddings = await embedTexts(chunks, 'RETRIEVAL_DOCUMENT');

  const rows = chunks
    .map((content, idx) => ({
      document_id: documentId,
      process_slug: processSlug,
      document_title: documentTitle,
      chunk_index: idx,
      content,
      embedding: embeddings[idx]
    }))
    .filter(row => row.embedding !== null);

  if (rows.length === 0) return 0;

  try {
    const { error } = await supabase.from('knowledge_document_chunks').insert(rows);
    if (error) {
      console.warn('⚠️ Error guardando fragmentos de la Base de Conocimiento:', error.message);
      return 0;
    }
    return rows.length;
  } catch (err: any) {
    console.warn('⚠️ Error guardando fragmentos de la Base de Conocimiento:', err?.message || err);
    return 0;
  }
}

/** Igual que searchRelevantChunks, pero contra la Base de Conocimiento. */
export async function searchKnowledgeChunks(
  processSlug: string,
  question: string,
  matchCount: number = 5
): Promise<{ documentTitle: string; content: string; similarity: number }[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [queryEmbedding] = await embedTexts([question], 'RETRIEVAL_QUERY');
    if (!queryEmbedding) return null;

    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      target_process_slug: processSlug,
      match_count: matchCount
    });

    if (error) {
      console.warn('⚠️ Error buscando fragmentos de la Base de Conocimiento:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      documentTitle: row.document_title,
      content: row.content,
      similarity: row.similarity
    }));
  } catch (err: any) {
    console.warn('⚠️ Error en búsqueda semántica de la Base de Conocimiento:', err?.message || err);
    return null;
  }
}

export interface RetrievedChunk {
  documentTitle: string;
  documentCode: string | null;
  content: string;
  similarity: number;
}

/**
 * Embebe la pregunta del usuario y busca los fragmentos más relevantes,
 * aislados estrictamente al proceso actual (la función SQL solo compara
 * contra fragmentos con ese `process_slug` exacto — sin fallback a
 * documentos "general" de otros procesos). Devuelve null si no se pudo
 * buscar (sin Supabase, sin embeddings, error) — quien llama debe caer al
 * comportamiento de respaldo en ese caso.
 */
export async function searchRelevantChunks(
  processSlug: string,
  question: string,
  matchCount: number = 5
): Promise<RetrievedChunk[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [queryEmbedding] = await embedTexts([question], 'RETRIEVAL_QUERY');
    if (!queryEmbedding) return null;

    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      target_process_slug: processSlug,
      match_count: matchCount
    });

    if (error) {
      console.warn('⚠️ Error buscando fragmentos relevantes en Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      documentTitle: row.document_title,
      documentCode: row.document_code,
      content: row.content,
      similarity: row.similarity
    }));
  } catch (err: any) {
    console.warn('⚠️ Error en búsqueda semántica:', err?.message || err);
    return null;
  }
}
