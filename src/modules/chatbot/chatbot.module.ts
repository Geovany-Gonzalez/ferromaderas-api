import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { AI_PROVIDER } from './chatbot.constants';
import { OpenAiProvider } from './providers/openai.provider';
import { BitacoraModule } from '../bitacora/bitacora.module';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { PoliciesModule } from '../policies/policies.module';

/**
 * Módulo del chatbot del sitio público.
 * - Responde con FAQs editables (sin costo) y, si hace falta, con IA controlada.
 * - La IA solo recibe información PÚBLICA (catálogo, categorías, políticas).
 * - SOLID - Open/Closed: el proveedor de IA se inyecta por token (AI_PROVIDER),
 *   así se puede cambiar OpenAI por otro sin tocar el servicio.
 */
@Module({
  imports: [BitacoraModule, ProductsModule, CategoriesModule, PoliciesModule],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    {
      provide: AI_PROVIDER,
      useClass: OpenAiProvider,
    },
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
