import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WhatsAppContact, WhatsAppConversation, WhatsAppMessage } from '../types';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
  } catch (err) {
    console.error('Error inicializando Supabase Client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

// Persistencia asíncrona de evento Webhook
export async function persistWebhookEventToSupabase(payload: any, status: 'processed' | 'failed' | 'invalid_signature' = 'processed', errorMsg?: string) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('whatsapp_webhook_events').insert({
      payload,
      status,
      error_message: errorMsg || null,
      processed_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ No se pudo guardar evento webhook en Supabase (Verificar esquema):', err);
  }
}

// Persistencia asíncrona de contacto en Supabase
export async function persistContactToSupabase(contact: WhatsAppContact) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('whatsapp_contacts').upsert({
      id: contact.id,
      wa_phone: contact.waPhone,
      full_name: contact.fullName,
      role: contact.role || 'Operario Planta',
      process_slug: contact.processSlug || 'corte-perfileria',
      is_new_worker: contact.isNewWorker ?? false,
      created_at: contact.createdAt || new Date().toISOString()
    }, { onConflict: 'wa_phone' });
  } catch (err) {
    console.warn('⚠️ Supabase sync (contacts):', err);
  }
}

// Persistencia asíncrona de conversación en Supabase
export async function persistConversationToSupabase(conv: WhatsAppConversation) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('whatsapp_conversations').upsert({
      id: conv.id,
      contact_id: conv.contactId,
      bot_active: conv.botActive,
      last_message_at: conv.lastMessageAt,
      process_slug: conv.processSlug || 'corte-perfileria',
      unread_count: conv.unreadCount || 0
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('⚠️ Supabase sync (conversations):', err);
  }
}

// Persistencia asíncrona de mensaje en Supabase
export async function persistMessageToSupabase(msg: WhatsAppMessage) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('whatsapp_messages').insert({
      id: msg.id,
      conversation_id: msg.conversationId,
      wa_message_id: msg.waMessageId || null,
      direction: msg.direction,
      sender: msg.sender,
      content: msg.content,
      media_type: msg.mediaType || 'text',
      media_url: msg.mediaUrl || null,
      raw_payload: msg.raw ? JSON.stringify(msg.raw) : null,
      created_at: msg.timestamp || new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ Supabase sync (messages):', err);
  }
}

// SQL DDL Helper para generar tablas en Supabase
export const SUPABASE_SQL_SCHEMA = `-- ESQUEMA DE BASE DE DATOS EN SUPABASE PARA WHATSAPP WEBHOOK & CALIDAD ALCO S.A.S.

-- 1. Tabla de Registros de Webhook de Meta
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'processed',
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Contactos / Operarios de Planta
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id VARCHAR(100) PRIMARY KEY,
  wa_phone VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(100) DEFAULT 'Operario Planta',
  process_slug VARCHAR(100) DEFAULT 'corte-perfileria',
  is_new_worker BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Conversaciones de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id VARCHAR(100) PRIMARY KEY,
  contact_id VARCHAR(100) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  bot_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  process_slug VARCHAR(100) DEFAULT 'corte-perfileria',
  unread_count INT DEFAULT 0
);

-- 4. Tabla de Mensajes Mensajes Inbound/Outbound
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(100) PRIMARY KEY,
  conversation_id VARCHAR(100) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  wa_message_id VARCHAR(150),
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  sender VARCHAR(20) CHECK (sender IN ('contact', 'bot', 'human')),
  content TEXT NOT NULL,
  media_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Auditorías y Citas de Calidad
CREATE TABLE IF NOT EXISTS whatsapp_appointments (
  id VARCHAR(100) PRIMARY KEY,
  contact_id VARCHAR(100) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  service VARCHAR(255) NOT NULL,
  process_slug VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  is_new_patient_or_worker BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Documentos PDF cargados al motor RAG
CREATE TABLE IF NOT EXISTS rag_custom_documents (
  id VARCHAR(100) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  process_slug VARCHAR(100) DEFAULT 'general',
  title VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  extracted_text TEXT,
  page_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_process_slug ON whatsapp_contacts(process_slug);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact_id ON whatsapp_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at ON whatsapp_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_appointments_process_slug ON whatsapp_appointments(process_slug);
CREATE INDEX IF NOT EXISTS idx_rag_custom_documents_process_slug ON rag_custom_documents(process_slug);

-- Habilitar RLS (Row Level Security). El backend usa SUPABASE_SERVICE_ROLE_KEY, que ignora RLS.
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_custom_documents ENABLE ROW LEVEL SECURITY;
`;
