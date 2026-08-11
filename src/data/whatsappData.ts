import { 
  WhatsAppAgentConfig, 
  WhatsAppContact, 
  WhatsAppConversation, 
  WhatsAppMessage 
} from '../types';

export const DEFAULT_AGENT_CONFIG: WhatsAppAgentConfig = {
  systemPrompt: `Eres el Agente Virtual de WhatsApp Oficial de Calidad Alco S.A.S.
Atiendes en tiempo real a colaboradores, supervisores y clientes que escanean los códigos QR de las plantillas físicas de procesos en planta o consultan información técnica vía WhatsApp.

TUS CAPACIDADES Y HERRAMIENTAS:
1. Consulta de Estándares RAG: Respondes con tolerancias, criterios de aceptación/rechazo y niveles de autonomía oficial.
2. Escalamiento a Humano (Handoff): Si una consulta excede la documentación o un supervisor es requerido, transfieres el caso a un líder de calidad.
3. Identificación de Operario: Tomas el nombre y proceso para mantener trazabilidad.

REGLAS DE RESPUESTA WHATSAPP:
• Usa formato directo con viñetas emoji (✅, 📐, ⚠️, 📌).
• Respuestas concisas, claras y orientadas a la acción en planta.
• Nunca inventes datos técnicos. Si no existe en la norma, indica que no está contemplado y sugiere pedir supervisor humano.`,
  tone: 'Profesional, preciso y cromaticamente claro',
  businessInfo: {
    companyName: 'Alco Windows & Doors S.A.S.',
    plantAddress: 'Planta Principal Industrial Alco, Vía Rionegro - Medellín Km 4',
    supportEmail: 'calidad@alco.com.co',
    emergencyExt: 'Ext. 101 - Seguridad Industrial & Calidad',
    description: 'Sistema Unificado de Agente de Calidad WhatsApp para Plantillas Físicas y Asistencia Técnica',
    faq: [
      {
        question: '¿Cómo consultar una tolerancia escaneando la plantilla?',
        answer: 'Solo selecciona o escanea el QR del proceso y escribe tu duda por WhatsApp (ej: "¿Tolerancia en corte de perfiles?").'
      },
      {
        question: '¿Qué hacer ante un defecto no documentado?',
        answer: 'Escribe "Escalar a Calidad" o solicita hablar con un supervisor en el chat.'
      }
    ]
  },
  services: [
    {
      id: 'srv-1',
      name: 'Auditoría de Corte de Perfiles y Ángulo (±0.2°)',
      durationMinutes: 30,
      description: 'Inspección de calibración de tronzadoras, escuadreo e inspección de retazos.',
      processSlug: 'corte-perfileria'
    },
    {
      id: 'srv-2',
      name: 'Prueba de Adherencia de Pintura (ASTM D3359)',
      durationMinutes: 45,
      description: 'Medición de espesor en micras (60-80 µm) y ensayo de corte en enrejado.',
      processSlug: 'pintura'
    },
    {
      id: 'srv-3',
      name: 'Verificación de Troquelado y Desahogos',
      durationMinutes: 30,
      description: 'Verificación de matrices de perforación (25x5 mm) y ausencia de rebabas.',
      processSlug: 'troquelado'
    },
    {
      id: 'srv-4',
      name: 'Auditoría de Fragmentación de Vidrio Templado',
      durationMinutes: 60,
      description: 'Ensayo de rotura en muestra (≥40 partículas en 50x50 mm) y choque térmico.',
      processSlug: 'vidrio-crudo-templado'
    },
    {
      id: 'srv-5',
      name: 'Revisión de Diagonales e Ingletes en Ensamble',
      durationMinutes: 45,
      description: 'Verificación de descuadre de diagonales (≤1.5 mm) y hermeticidad de escuadras.',
      processSlug: 'ensamble'
    }
  ],
  businessHours: {
    mon: [{ start: '06:00', end: '18:00' }],
    tue: [{ start: '06:00', end: '18:00' }],
    wed: [{ start: '06:00', end: '18:00' }],
    thu: [{ start: '06:00', end: '18:00' }],
    fri: [{ start: '06:00', end: '18:00' }],
    sat: [{ start: '07:00', end: '13:00' }]
  },
  handoffMessage: 'Te transfiero en este momento con el Supervisor de Calidad en planta. Un operario humano revisará el caso.',
  graphApiVersion: 'v25.0',
  phoneNumberId: '109823471239845',
  wabaId: '554329012384',
  accessToken: 'EAAG9xZ...ALCO_OFFICIAL_META_GRAPH_TOKEN',
  verifyToken: 'alco_quality_wa_webhook_token_2026',
  appSecret: '98f7e2a14b5c6d3e8f9a0b1c2d3e4f5a',
  integrationMode: 'open_gateway'
};

export const INITIAL_CONTACTS: WhatsAppContact[] = [
  {
    id: 'cnt-1',
    waPhone: '+573104567890',
    fullName: 'Carlos Gómez',
    role: 'Cortador de Planta',
    processSlug: 'corte-perfileria',
    isNewWorker: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cnt-2',
    waPhone: '+573009876543',
    fullName: 'Mariana Ríos',
    role: 'Supervisora de Cabina Pintura',
    processSlug: 'pintura',
    isNewWorker: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cnt-3',
    waPhone: '+573151122334',
    fullName: 'Ing. Fernando Pérez',
    role: 'Residente Obra Torre Central',
    processSlug: 'ensamble',
    isNewWorker: true,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_CONVERSATIONS: WhatsAppConversation[] = [
  {
    id: 'conv-1',
    contactId: 'cnt-1',
    contact: INITIAL_CONTACTS[0],
    botActive: true,
    processSlug: 'corte-perfileria',
    lastMessageAt: new Date(Date.now() - 5 * 60000).toISOString(),
    unreadCount: 0
  },
  {
    id: 'conv-2',
    contactId: 'cnt-2',
    contact: INITIAL_CONTACTS[1],
    botActive: false,
    processSlug: 'pintura',
    lastMessageAt: new Date(Date.now() - 30 * 60000).toISOString(),
    unreadCount: 1
  },
  {
    id: 'conv-3',
    contactId: 'cnt-3',
    contact: INITIAL_CONTACTS[2],
    botActive: true,
    processSlug: 'ensamble',
    lastMessageAt: new Date(Date.now() - 120 * 60000).toISOString(),
    unreadCount: 0
  }
];

export const INITIAL_MESSAGES: Record<string, WhatsAppMessage[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      direction: 'inbound',
      sender: 'contact',
      content: 'Hola, acabo de escanear la plantilla física de Corte de Perfilería. ¿Cuál es la tolerancia máxima permitida en la longitud del perfil?',
      timestamp: new Date(Date.now() - 6 * 60000).toISOString()
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      direction: 'outbound',
      sender: 'bot',
      content: `Hola Carlos 👋. Según el estándar oficial **INS-COR-01 v2.3** para **Corte de Perfiles de Aluminio**:

📐 **Tolerancia Dimensional:** ±0.5 mm
📐 **Tolerancia Angular:** ±0.2°

⚠️ **Criterio de Rechazo:** Perfiles con diferencia > 0.5 mm o marcas de rayaduras de extrusión.

📌 **Tu Autonomía (Nivel 1):** Puedes ajustar el tope micrométrico para corregir desviaciones dentro de ±0.5 mm. Si la descalibración persiste, escala a Supervisor.`,
      timestamp: new Date(Date.now() - 5 * 60000).toISOString()
    }
  ],
  'conv-2': [
    {
      id: 'msg-3',
      conversationId: 'conv-2',
      direction: 'inbound',
      sender: 'contact',
      content: 'Tengo un lote de perfiles con 55 micras de pintura electrostática tras el horneado. Requiero concepto técnico urgente.',
      timestamp: new Date(Date.now() - 31 * 60000).toISOString()
    },
    {
      id: 'msg-4',
      conversationId: 'conv-2',
      direction: 'outbound',
      sender: 'bot',
      content: `Hola Mariana. El estándar **CRIT-PIN-02 (Aprobado por Laboratorio)** exige un rango de **60 a 80 µm** de espesor de capa. 55 µm está fuera de rango.

Te transfiero con el Inspector de Calidad de Pintura para autorizar prueba de adherencia ASTM D3359.`,
      timestamp: new Date(Date.now() - 30.5 * 60000).toISOString()
    },
    {
      id: 'msg-5',
      conversationId: 'conv-2',
      direction: 'outbound',
      sender: 'human',
      content: 'Mariana, ya voy para la cabina con el medidor elcometer para hacer la prueba de cuadrícula.',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString()
    }
  ],
  'conv-3': [
    {
      id: 'msg-6',
      conversationId: 'conv-3',
      direction: 'inbound',
      sender: 'contact',
      content: 'Buenas tardes. ¿Tienen opción de agendar una auditoría presencial en fábrica para verificar el ensamble de las ventanas de la Torre Central?',
      timestamp: new Date(Date.now() - 121 * 60000).toISOString()
    },
    {
      id: 'msg-7',
      conversationId: 'conv-3',
      direction: 'outbound',
      sender: 'bot',
      content: `Buenas tardes Ing. Fernando. Claro que sí. Tenemos los siguientes horarios libres para **Revisión de Diagonales e Ingletes en Ensamble**:

1️⃣ Mañana 09:00 AM
2️⃣ Mañana 02:30 PM
3️⃣ Jueves 10:00 AM

Por favor indícame la opción de tu preferencia o responde con tu hora ideal para confirmar la cita en nuestro sistema.`,
      timestamp: new Date(Date.now() - 120 * 60000).toISOString()
    }
  ]
};
