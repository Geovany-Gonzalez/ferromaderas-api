import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiChatMessage,
  AiCompletion,
  IAiProvider,
} from '../interfaces/ai-provider.interface';

/** Forma mínima de la respuesta del endpoint de OpenAI que nos interesa. */
interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
}

/**
 * Proveedor de IA basado en la API de OpenAI (Chat Completions).
 *
 * Seguridad: la API key vive SOLO en el backend (variable de entorno
 * OPENAI_API_KEY). El navegador nunca la ve; el frontend solo habla con
 * nuestro endpoint /api/chatbot/message.
 *
 * SOLID - Single Responsibility: solo se encarga de llamar al modelo y
 * devolver el texto + el consumo de tokens.
 */
@Injectable()
export class OpenAiProvider implements IAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
    // Modelo económico por defecto; se puede cambiar sin tocar código.
    this.model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    this.maxTokens = Number(this.config.get<string>('OPENAI_MAX_TOKENS') ?? '400');
    this.baseUrl =
      this.config.get<string>('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';

    if (!this.apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY no configurada: el chatbot responderá solo con FAQs y mensajes predefinidos (sin IA, sin costo).',
      );
    }
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(messages: AiChatMessage[]): Promise<AiCompletion> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    // Tope duro de seguridad para no esperar indefinidamente y no encarecer.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          // Temperatura baja: respuestas más predecibles y apegadas al contexto.
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      const data = (await res.json()) as OpenAiChatResponse;

      if (!res.ok) {
        const detail = data?.error?.message ?? `HTTP ${res.status}`;
        throw new Error(`OpenAI respondió con error: ${detail}`);
      }

      return {
        content: data.choices?.[0]?.message?.content?.trim() ?? '',
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
