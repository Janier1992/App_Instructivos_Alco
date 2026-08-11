import { 
  WhatsAppAgentConfig, 
  WhatsAppContact, 
  WhatsAppConversation, 
  WhatsAppMessage 
} from '../types';
import { 
  DEFAULT_AGENT_CONFIG, 
  INITIAL_CONTACTS, 
  INITIAL_CONVERSATIONS, 
  INITIAL_MESSAGES 
} from '../data/whatsappData';
import { processQualityQueryServer } from './geminiClient';
import { 
  persistWebhookEventToSupabase, 
  persistContactToSupabase, 
  persistConversationToSupabase, 
  persistMessageToSupabase 
} from './supabaseService';

// Almacenamiento en memoria para el estado del agente de WhatsApp
let currentConfig: WhatsAppAgentConfig = { ...DEFAULT_AGENT_CONFIG };
let contacts: WhatsAppContact[] = [...INITIAL_CONTACTS];
let conversations: WhatsAppConversation[] = [...INITIAL_CONVERSATIONS];
let messagesStore: Record<string, WhatsAppMessage[]> = { ...INITIAL_MESSAGES };

export function getAgentConfig(): WhatsAppAgentConfig {
  return currentConfig;
}

export function updateAgentConfig(newConfig: Partial<WhatsAppAgentConfig>): WhatsAppAgentConfig {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    businessInfo: {
      ...currentConfig.businessInfo,
      ...(newConfig.businessInfo || {})
    }
  };
  return currentConfig;
}

export function getConversations(): WhatsAppConversation[] {
  return conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export function getMessages(conversationId: string): WhatsAppMessage[] {
  return messagesStore[conversationId] || [];
}

export function toggleBotActive(conversationId: string, active?: boolean): WhatsAppConversation | null {
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) return null;
  conv.botActive = active !== undefined ? active : !conv.botActive;

  // Persistir en Supabase
  persistConversationToSupabase(conv);

  return conv;
}

export function getOrCreateConversation(phone: string, name: string, processSlug: string = 'corte-perfileria'): WhatsAppConversation {
  let contact = contacts.find(c => c.waPhone === phone);
  if (!contact) {
    contact = {
      id: `cnt-${Date.now()}`,
      waPhone: phone,
      fullName: name || 'Colaborador Planta',
      processSlug,
      createdAt: new Date().toISOString()
    };
    contacts.push(contact);
    persistContactToSupabase(contact);
  }

  let conv = conversations.find(c => c.contactId === contact!.id);
  if (!conv) {
    conv = {
      id: `conv-${Date.now()}`,
      contactId: contact.id,
      contact,
      botActive: true,
      processSlug,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0
    };
    conversations.push(conv);
    messagesStore[conv.id] = [];
    persistConversationToSupabase(conv);
  }

  return conv;
}

export async function handleUserWhatsAppMessage(
  conversationId: string, 
  userText: string,
  mediaType: 'text' | 'audio' | 'image' = 'text',
  senderOverride: 'contact' | 'human' = 'contact',
  waMessageId?: string,
  rawPayload?: any
): Promise<{ userMsg: WhatsAppMessage; botMsg?: WhatsAppMessage; conv: WhatsAppConversation }> {
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) {
    throw new Error('Conversación no encontrada');
  }

  const now = new Date().toISOString();
  
  // 1. Guardar mensaje de usuario
  const userMsg: WhatsAppMessage = {
    id: `msg-${Date.now()}`,
    conversationId,
    waMessageId,
    direction: senderOverride === 'human' ? 'outbound' : 'inbound',
    sender: senderOverride,
    content: userText,
    mediaType,
    raw: rawPayload,
    timestamp: now
  };

  if (!messagesStore[conversationId]) {
    messagesStore[conversationId] = [];
  }
  messagesStore[conversationId].push(userMsg);
  conv.lastMessageAt = now;

  // Persistencia asíncrona en Supabase
  persistMessageToSupabase(userMsg);
  persistConversationToSupabase(conv);

  // Si el mensaje viene de un operador humano, no genera respuesta de bot
  if (senderOverride === 'human') {
    return { userMsg, conv };
  }

  // 2. Si el bot está inactivo (handoff a humano activo), responder con aviso de espera
  if (!conv.botActive) {
    const noticeMsg: WhatsAppMessage = {
      id: `msg-${Date.now() + 1}`,
      conversationId,
      direction: 'outbound',
      sender: 'human',
      content: currentConfig.handoffMessage || '📌 [Operador Humano Asignado] Tu mensaje fue recibido. Un supervisor de calidad se pondrá en contacto brevemente.',
      timestamp: new Date().toISOString()
    };
    messagesStore[conversationId].push(noticeMsg);
    persistMessageToSupabase(noticeMsg);
    return { userMsg, botMsg: noticeMsg, conv };
  }

  // 3. Procesar intensión o escalamiento / consulta RAG
  const lower = userText.toLowerCase();
  const processSlug = conv.processSlug || 'corte-perfileria';

  let botReplyText = '';

  // Detección de herramientas del agente de WhatsApp
  if (lower.includes('escalar') || lower.includes('supervisor') || lower.includes('humano')) {
    // Tool: request_human_handoff
    conv.botActive = false; // Desactivar bot para transferir
    persistConversationToSupabase(conv);
    botReplyText = `⚠️ **Escalamiento a Supervisor Solicitado**\n\n${currentConfig.handoffMessage}\n\nHe puesto en pausa el bot para este chat. El Supervisor de Calidad del área de **${processSlug.toUpperCase()}** ha recibido la notificación y responderá directamente en este canal.`;
  } else {
    // Consulta Estándar RAG con Gemini / RAG Engine
    const ragResult = await processQualityQueryServer(
      processSlug, 
      userText, 
      messagesStore[conversationId].map(m => ({
        id: m.id,
        role: m.sender === 'contact' ? 'user' : 'assistant',
        content: m.content,
        timestamp: m.timestamp
      })),
      currentConfig.systemPrompt
    );

    botReplyText = ragResult.reply;

    // Si la consulta exige escalamiento según RAG, notificar transferencia
    if (ragResult.escalationRequired) {
      conv.botActive = false;
      persistConversationToSupabase(conv);
    }
  }

  const botMsg: WhatsAppMessage = {
    id: `msg-${Date.now() + 2}`,
    conversationId,
    direction: 'outbound',
    sender: 'bot',
    content: botReplyText,
    timestamp: new Date().toISOString()
  };

  messagesStore[conversationId].push(botMsg);
  conv.lastMessageAt = botMsg.timestamp;

  // Persistir mensaje del bot y estado actualizado de conversación en Supabase
  persistMessageToSupabase(botMsg);
  persistConversationToSupabase(conv);

  return { userMsg, botMsg, conv };
}

/**
 * JOB ASÍNCRONO DE PROCESAMIENTO DE WEBHOOK DE WHATSAPP
 * Admite tanto el formato oficial de Meta Cloud API como gateways abiertos / autónomos (Baileys, Evolution API, cURL, etc.).
 */
export async function processWebhookAsyncJob(body: any): Promise<void> {
  console.log('⚡ [JOB ASÍNCRONO] Procesando evento Webhook de WhatsApp...');
  
  // Guardar evento raw en Supabase si está disponible
  await persistWebhookEventToSupabase(body, 'processed');

  // CASO 1: Formato Oficial de Meta Cloud API
  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (value && value.messages && value.messages[0]) {
          const msg = value.messages[0];
          const fromPhone = msg.from;
          const senderName = value.contacts?.[0]?.profile?.name || 'Operario Planta';
          const textContent = msg.text?.body || msg.caption || 'Consulta recibida vía WhatsApp';
          const mediaType = msg.type === 'image' ? 'image' : msg.type === 'audio' ? 'audio' : 'text';
          const waMessageId = msg.id;

          console.log(`📩 [META CLOUD API] Mensaje recibido de ${senderName} (${fromPhone}): "${textContent}"`);

          const conv = getOrCreateConversation(fromPhone, senderName, 'corte-perfileria');

          const result = await handleUserWhatsAppMessage(
            conv.id, 
            textContent, 
            mediaType, 
            'contact', 
            waMessageId, 
            msg
          );

          console.log(`✅ [JOB COMPLETADO] Respuesta del Agente generada para ${fromPhone}: "${result.botMsg?.content.substring(0, 60)}..."`);
        }
      }
    }
    return;
  }

  // CASO 2: Formato Directo de Gateway Abierto / Autónomo (Baileys, Evolution API, Z-API, cURL, Simulator)
  const fromPhone = body.phone || body.from || body.sender || body.waPhone || body.number;
  const textContent = body.message || body.text || body.content || body.caption;

  if (fromPhone || textContent) {
    const senderName = body.name || body.fullName || body.senderName || body.profileName || 'Operario Planta';
    const processSlug = body.processSlug || body.process || 'corte-perfileria';
    const text = textContent || 'Consulta general de calidad en planta';
    const mediaType = body.mediaType || 'text';

    console.log(`📩 [GATEWAY ABIERTO / AUTÓNOMO] Mensaje recibido de ${senderName} (${fromPhone}): "${text}"`);

    const conv = getOrCreateConversation(fromPhone || '+573104567890', senderName, processSlug);

    const result = await handleUserWhatsAppMessage(
      conv.id, 
      text, 
      mediaType, 
      'contact', 
      `custom-gw-${Date.now()}`, 
      body
    );

    console.log(`✅ [JOB COMPLETADO] Respuesta del Agente generada para ${fromPhone}: "${result.botMsg?.content.substring(0, 60)}..."`);
    return;
  }

  console.log('ℹ️ Evento Webhook recibido no contenía una estructura reconocible de mensaje');
}
