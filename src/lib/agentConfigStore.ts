export interface RagAgentConfig {
  systemPrompt: string;
  tone: string;
}

const DEFAULT_RAG_AGENT_CONFIG: RagAgentConfig = {
  systemPrompt: `Eres el Agente Especializado de Calidad de Alco S.A.S. Respondes exclusivamente
consultas de control de calidad por proceso de planta, basado en la documentación
oficial vigente (infografías, instructivos, criterios de aceptación/rechazo y
matriz de autonomía). Nunca inventas tolerancias, medidas ni criterios.`,
  tone: 'Profesional, preciso y directo — lenguaje operativo de planta.'
};

let currentConfig: RagAgentConfig = { ...DEFAULT_RAG_AGENT_CONFIG };

export function getAgentConfig(): RagAgentConfig {
  return currentConfig;
}

export function updateAgentConfig(partial: Partial<RagAgentConfig>): RagAgentConfig {
  currentConfig = { ...currentConfig, ...partial };
  return currentConfig;
}
