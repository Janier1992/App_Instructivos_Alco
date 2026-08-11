-- ============================================================
-- ESQUEMA DE BASE DE DATOS - Control de Procesos de Calidad Alco S.A.S.
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New Query
-- Es idempotente (CREATE TABLE IF NOT EXISTS): se puede volver a correr sin romper nada.
-- ============================================================

-- 1. Registros crudos de eventos entrantes del Webhook de WhatsApp (Meta / Gateway Abierto)
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'processed',
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contactos / Operarios de Planta
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

-- 3. Conversaciones de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id VARCHAR(100) PRIMARY KEY,
  contact_id VARCHAR(100) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  bot_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  process_slug VARCHAR(100) DEFAULT 'corte-perfileria',
  unread_count INT DEFAULT 0
);

-- 4. Mensajes Inbound/Outbound
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

-- 5. Auditorías y Citas de Calidad
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

-- 6. Documentos PDF cargados al motor RAG (usada por src/lib/customRagStore.ts)
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

-- ============================================================
-- ÍNDICES (rendimiento en producción: búsquedas por proceso, teléfono y conversación)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_process_slug ON whatsapp_contacts(process_slug);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact_id ON whatsapp_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at ON whatsapp_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_appointments_process_slug ON whatsapp_appointments(process_slug);
CREATE INDEX IF NOT EXISTS idx_rag_custom_documents_process_slug ON rag_custom_documents(process_slug);

-- ============================================================
-- ROW LEVEL SECURITY
-- El backend (server.ts) siempre se conecta con SUPABASE_SERVICE_ROLE_KEY,
-- que ignora RLS. Se habilita RLS sin policies para bloquear cualquier
-- acceso directo desde el navegador con la anon key.
-- ============================================================
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_custom_documents ENABLE ROW LEVEL SECURITY;
