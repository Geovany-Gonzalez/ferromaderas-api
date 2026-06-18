# Chatbot de Ferromaderas — Cómo funciona

Asistente del sitio público que responde con **preguntas prelistadas (FAQs)** y,
cuando hace falta, con **IA (OpenAI)** usando únicamente información pública del
sistema. Está integrado a la arquitectura existente (Angular + NestJS +
Prisma/PostgreSQL), sin depender de una plataforma de chatbot externa.

---

## 1. Idea general

El chatbot responde en **dos niveles**:

1. **Preguntas prelistadas (FAQs):** botones con preguntas comunes
   (ubicación, horarios, envíos, pagos, cotización…). Se responden con texto
   guardado en la base de datos. **No consumen IA (costo cero).**
2. **Pregunta libre:** si el usuario escribe algo que no coincide con una FAQ y
   hay IA configurada, el backend arma un contexto con información **pública**
   (catálogo activo, categorías, políticas) y le pide la respuesta a OpenAI.

Si la IA no está configurada o falla, el bot da un **mensaje de respaldo** seguro
(invita a WhatsApp / catálogo). Nunca se queda “roto”.

```
Usuario (navegador)
        │  escribe / toca una pregunta
        ▼
Angular  ── POST /api/chatbot/message ──►  NestJS (ChatbotService)
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                   ¿coincide FAQ?        IA (OpenAI)        Respaldo seguro
                   (sin costo)        (info pública)       (sin costo)
                          │                   │                   │
                          └───────────────────┼───────────────────┘
                                              ▼
                              Guarda en historial (BD) + mide tokens
                                              ▼
                          Respuesta + preguntas sugeridas → Angular
```

---

## 2. Seguridad (lo importante para defenderlo)

- La **API key de OpenAI vive solo en el backend** (variable de entorno). El
  navegador nunca la ve; solo habla con nuestro endpoint.
- La IA recibe **solo información pública**: catálogo activo, categorías y
  políticas. **Nunca** ve usuarios, bitácora, estadísticas internas ni la
  cadena de conexión `DATABASE_URL`.
- El bot **solo informa**: no crea, edita ni borra nada.
- **Límites anti-abuso / anti-costo:** máximo de mensajes por IP por minuto,
  máximo de mensajes por conversación y respuestas cortas (`OPENAI_MAX_TOKENS`).
- Los endpoints de administración están protegidos con `JwtAuthGuard` +
  permiso `manage_chatbot`.

---

## 3. Componentes (dónde está cada cosa)

### Backend — `feromaderas-api/src/modules/chatbot/`

| Archivo | Responsabilidad |
|---|---|
| `chatbot.controller.ts` | Endpoints públicos y de admin. |
| `chatbot.service.ts` | Lógica central: reglas (FAQ) + IA + persistencia + métricas. |
| `providers/openai.provider.ts` | Única pieza que llama a OpenAI. Devuelve texto + tokens. |
| `interfaces/ai-provider.interface.ts` | Contrato del proveedor de IA (permite cambiar de proveedor). |
| `chatbot.constants.ts` | Token de inyección `AI_PROVIDER`. |
| `dto/chatbot.dto.ts` | Validación de entradas (mensaje, FAQ, nombre). |

Modelos en `prisma/schema.prisma`:

- `ChatFaq`: preguntas/respuestas editables desde el panel.
- `ChatConversation`: una conversación por sesión del navegador (incluye el
  nombre opcional del visitante).
- `ChatMessage`: cada mensaje del historial, con tokens de IA para medir consumo.

### Frontend — `ferromaderas-frontend/src/app/`

| Archivo | Responsabilidad |
|---|---|
| `shared/components/chatbot/` | Widget flotante del sitio público. |
| `core/services/chatbot.service.ts` | Habla con el backend (FAQs, mensajes, nombre, sesión). |
| `features/admin/chatbot-admin/` | Panel de administración (FAQs, métricas, conversaciones). |
| `core/services/chatbot-admin.service.ts` | Llamadas del panel admin. |

---

## 4. Endpoints

### Públicos
- `GET /api/chatbot/faqs` — preguntas prelistadas activas (botones del widget).
- `POST /api/chatbot/message` — envía un mensaje y recibe la respuesta.
  - Body: `{ "message": string, "sessionId"?: string, "name"?: string }`
  - Respuesta: `{ conversationId, answer, source: 'faq'|'ia'|'fallback', suggestions[] }`

### Admin (requieren login + permiso `manage_chatbot`)
- `GET /api/chatbot/admin/faqs` · `POST` · `PUT /:id` · `DELETE /:id` — gestión de FAQs.
- `GET /api/chatbot/admin/metrics` — conteos, tokens, costo estimado, top preguntas.
- `GET /api/chatbot/admin/usage` — consumo de tokens y costo por día (30 días).
- `GET /api/chatbot/admin/conversations` — historial paginado.
- `GET /api/chatbot/admin/conversations/:id` — detalle (mensajes) de una conversación.

---

## 5. Cómo se decide la respuesta (paso a paso)

1. Se valida el mensaje y se aplican los **límites** (IP / tamaño de conversación).
2. Se busca/crea la **conversación** por `sessionId` y se guarda el mensaje del usuario.
3. **Coincidencia con FAQ:** se compara el texto (sin tildes ni signos) contra la
   pregunta y las **palabras clave** de cada FAQ. Si supera el umbral → se responde
   con la FAQ (**source = `faq`**, sin costo).
4. **IA:** si no hubo FAQ y hay `OPENAI_API_KEY`, se arma el contexto público y se
   llama a OpenAI con el historial reciente (**source = `ia`**). Se guardan los tokens.
5. **Respaldo:** si no hay IA o falla, mensaje seguro (**source = `fallback`**).
6. Se guarda la respuesta y se devuelven también **preguntas sugeridas**.

---

## 6. Personalización con el nombre

- La primera vez, el widget pregunta el nombre (**opcional**) — es un paso de UI,
  **no** una llamada a IA, así que **no cuesta tokens**.
- El nombre se guarda en el navegador y en la conversación, y se envía con cada
  mensaje. En respuestas con IA se incluye en el prompt (~5–10 tokens, costo
  despreciable) para que el asistente trate al visitante por su nombre.
- En el panel admin, cada conversación muestra el nombre (o “Anónimo”).

---

## 7. Configuración (variables de entorno)

En `feromaderas-api/.env`:

```bash
# Si NO se define OPENAI_API_KEY, el chatbot funciona solo con FAQs (sin costo).
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini        # modelo económico por defecto
OPENAI_MAX_TOKENS=400           # largo máximo de la respuesta (controla costo)
OPENAI_BASE_URL=https://api.openai.com/v1   # cambiar solo si usás Azure OpenAI
# Precios por 1,000,000 de tokens (USD), para el costo estimado del panel:
OPENAI_PRICE_INPUT_PER_1M=0.15
OPENAI_PRICE_OUTPUT_PER_1M=0.60
```

Primera vez (crear tablas y datos):

```bash
cd feromaderas-api
npm run prisma:migrate -- --name chatbot   # crea las tablas del chatbot
npm run prisma:seed                        # permiso manage_chatbot + FAQs iniciales
```

---

## 8. Cómo verificar consumos

1. **Panel propio:** `Admin → Chatbot → Métricas y consumo`. Muestra tokens
   usados, **costo estimado en USD**, consumo por día y respuestas por origen
   (FAQ vs IA vs respaldo). El precio por millón de tokens es configurable.
2. **Dashboard de OpenAI:** <https://platform.openai.com/usage> para el cobro
   real y para fijar **límites de gasto** (Billing → Limits).

> El costo del panel es un **estimado local** calculado con los tokens guardados;
> el valor oficial siempre es el de OpenAI.

---

## 9. Control de costos (resumen)

- Las FAQs responden gratis; la IA solo entra cuando no hay coincidencia.
- Respuestas cortas (`OPENAI_MAX_TOKENS`) y modelo económico (`gpt-4o-mini`).
- Solo se manda al modelo el contexto **filtrado** (productos relevantes a la
  consulta), no todo el catálogo.
- Límite de mensajes por IP y por conversación.
- Cache del catálogo en memoria para no golpear la BD en cada mensaje.
