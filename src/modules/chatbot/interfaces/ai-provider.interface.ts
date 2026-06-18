/**
 * Contrato del proveedor de IA usado por el chatbot.
 * Permite cambiar de proveedor (OpenAI, Azure OpenAI, etc.) sin tocar el servicio.
 */

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiChatMessage {
  role: AiRole;
  content: string;
}

/** Consumo reportado por el proveedor (para medir costo). */
export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiCompletion {
  content: string;
  usage: AiUsage;
}

export interface IAiProvider {
  /** true si hay credenciales configuradas y se puede llamar a la IA. */
  isAvailable(): boolean;
  /** Envía la conversación al modelo y devuelve la respuesta + consumo. */
  chat(messages: AiChatMessage[]): Promise<AiCompletion>;
}
