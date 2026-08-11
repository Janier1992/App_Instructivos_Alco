/**
 * Modelos de datos para el Aplicativo de Control de Procesos de Calidad Alco S.A.S.
 */

export type DocumentStatus = 'vigente' | 'obsoleto' | 'pendiente';

export type CriticalLevel = 'crítico' | 'alto' | 'medio';

export type AutonomyLevel = 'Nivel 1' | 'Nivel 2' | 'Nivel 3' | 'Nivel 4';

export interface ProcessItem {
  id: string;
  slug: string;
  name: string;
  code: string;
  iconName: string;
  department: string;
  description: string;
  activeVersion: string;
  effectiveDate: string;
  owner: string;
  approvedBy: string;
  status: DocumentStatus;
  infographicTitle: string;
  infographicSummary: string;
  infographicUrl?: string;
  keyAspects: string[];
}

export interface QualityControl {
  id: string;
  processId: string;
  code: string;
  title: string;
  description: string;
  criticalLevel: CriticalLevel;
  inspectionFrequency: string;
  standardValue: string;
  tolerance: string;
}

export interface AcceptanceCriterion {
  id: string;
  processId: string;
  controlId: string;
  parameter: string;
  acceptance: string;
  rejection: string;
  requiredAction: string;
  visualRef?: string;
}

export interface AutonomyLevelItem {
  level: AutonomyLevel;
  title: string;
  role: string;
  scope: string;
  allowedActions: string[];
  escalationCondition: string;
  contactPerson: string;
}

export interface DocumentItem {
  id: string;
  processId: string;
  title: string;
  code: string;
  version: string;
  status: DocumentStatus;
  effectiveDate: string;
  owner: string;
  approvedBy: string;
  documentType: 'infografia' | 'instructivo' | 'criterio' | 'matriz_autonomia' | 'formato';
  contentText: string;
  sections: { title: string; content: string }[];
}

export type QueryClassification = 
  | 'A_CONSULTA_DOCUMENTAL'
  | 'B_CRITERIO_ACEPTACION_RECHAZO'
  | 'C_CONTROL_CRITICO'
  | 'D_MATRIZ_AUTONOMIA'
  | 'E_CASO_NO_DOCUMENTADO'
  | 'F_CONFLICTO_DOCUMENTAL'
  | 'G_FUERA_DE_ALCANCE'
  | 'H_INTENTO_MANIPULACION_INYECCION';

export interface SourceReference {
  documentTitle: string;
  code: string;
  version: string;
  section: string;
  effectiveDate: string;
  status: DocumentStatus;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  classification?: QueryClassification;
  sourceReferences?: SourceReference[];
  autonomyLevel?: AutonomyLevel;
  escalationRequired?: boolean;
  escalationReason?: string;
  isError?: boolean;
}

export interface GoldenTestCase {
  id: string;
  processSlug: string;
  category: 'Correcto' | 'No Documentado' | 'Ambiguo' | 'Conflicto Documental' | 'Seguridad' | 'Fuera de Alcance';
  question: string;
  expectedBehavior: string;
  expectedSource?: string;
  expectedEscalation: boolean;
}

export interface GoldenEvalResult {
  testCaseId: string;
  processSlug: string;
  category: string;
  question: string;
  passed: boolean;
  actualResponse: string;
  actualClassification?: QueryClassification;
  actualSource?: string;
  escalationTriggered: boolean;
  expectedEscalation: boolean;
  latencyMs: number;
  notes: string;
}

// --- TIPOS DE AGENTE WHATSAPP Y WEBHOOK META ---

export type MessageDirection = 'inbound' | 'outbound';
export type MessageSender = 'contact' | 'bot' | 'human';
export type MediaType = 'text' | 'audio' | 'image';

export interface WhatsAppContact {
  id: string;
  waPhone: string;
  fullName: string;
  role?: string;
  processSlug?: string;
  isNewWorker?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  waMessageId?: string;
  direction: MessageDirection;
  sender: MessageSender;
  content: string;
  mediaType?: MediaType;
  mediaUrl?: string;
  timestamp: string;
  raw?: any;
}

export interface WhatsAppConversation {
  id: string;
  contactId: string;
  contact: WhatsAppContact;
  botActive: boolean;
  lastMessageAt: string;
  processSlug?: string;
  unreadCount?: number;
}

export interface WhatsAppAgentConfig {
  systemPrompt: string;
  tone: string;
  businessInfo: {
    companyName: string;
    plantAddress: string;
    supportEmail: string;
    emergencyExt: string;
    description: string;
    faq: { question: string; answer: string }[];
  };
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    description: string;
    processSlug: string;
  }[];
  businessHours: Record<string, { start: string; end: string }[]>;
  handoffMessage: string;
  graphApiVersion: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  integrationMode?: 'simulator' | 'open_gateway' | 'meta_official';
}

