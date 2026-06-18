/**
 * Token de inyección para el proveedor de IA del chatbot.
 * SOLID - Dependency Inversion: el servicio depende de la interfaz IAiProvider,
 * no de una implementación concreta (hoy OpenAI, mañana podría ser Azure, etc.).
 */
export const AI_PROVIDER = Symbol('AI_PROVIDER');
