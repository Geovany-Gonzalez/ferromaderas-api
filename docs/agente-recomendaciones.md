# Agente de IA de recomendaciones — Ferromaderas

Alineado al **alcance punto 13** y **limitación 9** del proyecto de graduación II.

---

## 1. Qué es (según el documento)

> *"El sistema incluirá un **agente de inteligencia artificial** orientado a la recomendación de productos relacionados, el cual sugerirá artículos **complementarios o alternativos** con base en la **consulta del cliente**, la **categoría del producto** y la **relación entre artículos del catálogo**."*

La **limitación de IA** del PG aclara que el **agente de recomendaciones no usa
motores externos de pago** (no es ChatGPT). Es un **agente propio** que razona
sobre datos del negocio (catálogo + co-ocurrencia en cotizaciones).

> Nota: el **chatbot** es otro componente. Puede usar OpenAI de forma **opcional**
> para preguntas libres; sin API key opera solo con FAQs. Eso no contradice esta
> limitación del agente de recomendaciones (ver `docs/chatbot.md`).

---

## 2. ¿Por qué se llama “agente de IA”?

En ciencias de la computación, **IA** no significa solo ChatGPT. Incluye sistemas que:

- **Perciben** el contexto del usuario (búsqueda, producto visto, carrito, categoría).
- **Razonan** sobre relaciones en el catálogo y en el historial de cotizaciones.
- **Actúan** sugiriendo productos con un tipo y una razón explicable.

Este agente es un **sistema de recomendación híbrido** (filtrado por contenido + filtrado colaborativo), categoría académica estándar en e-commerce y recuperación de información.

**Nivel técnico:** recomendador híbrido de **nivel aplicado** (no deep learning), apropiado para un PG con datos reales de una PYME.

| Enfoque | Este proyecto |
|---|---|
| Reglas fijas | Parcial (pesos y tipos) |
| Filtrado por contenido | Sí — consulta del cliente vs. nombre/código |
| Filtrado colaborativo | Sí — co-ocurrencia en `cotizacion_items` |
| Conocimiento de dominio | Sí — categorías, destacados, catálogo activo |
| Red neuronal / LLM externo | No (por limitación 9) |

---

## 3. ¿De dónde jala la data?

| Fuente en BD | Tabla / módulo | Para qué la usa el agente |
|---|---|---|
| Catálogo activo | `productos` | Candidatos a recomendar (solo `activo=true`) |
| Categorías | `categorias` | Agrupar alternativas en la misma categoría |
| Historial comercial | `cotizacion_items` | Patrones de venta cruzada (qué se cotiza junto) |
| Cotizaciones | `cotizaciones` | Agrupar ítems de la misma cotización |

**No usa:** usuarios admin, bitácora, estadísticas GA4, ni APIs externas.

### Señales del cliente (consulta)

| Señal | Origen en el sitio |
|---|---|
| `query` | Texto de búsqueda (`/buscar?q=cemento`) |
| `productId` | Ficha de producto (`/producto/:id`) |
| `categoryId` | Página de categoría |
| `cartCodes` | Códigos en el carrito actual |

---

## 4. Cómo funciona el motor (paso a paso)

```
Entrada: consulta + categoría + producto + carrito
              │
              ▼
    Cargar catálogo activo y contexto
              │
              ▼
    Calcular puntuación híbrida por producto:
      • Consulta (40%) — coincide nombre/código
      • Co-ocurrencia (35%) — va junto en cotizaciones
      • Categoría (20%) — misma categoría del contexto
      • Popularidad (15%) — más cotizado
      • Destacado (+5) — producto destacado
              │
              ▼
    Clasificar tipo:
      • complementario — otra categoría, alta co-ocurrencia
      • alternativo — misma categoría
      • relacionado — resto
              │
              ▼
    Ordenar, limitar, devolver con razón legible
```

---

## 5. API

### Endpoint principal
`GET /api/recommendation-agent`

**Query params:**

| Parámetro | Descripción |
|---|---|
| `query` | Consulta del cliente |
| `productId` | UUID del producto en contexto |
| `categoryId` | UUID de categoría |
| `cartCodes` | Códigos separados por coma |
| `limit` | Cantidad máxima (1–12) |

**Respuesta:** lista de recomendaciones + `meta` (fuentes de datos, algoritmo, contexto).

### Alias de compatibilidad
`GET /api/products/recommendations` — devuelve solo el array de productos (sin metadatos).

---

## 6. Dónde aparece en el frontend

| Pantalla | Contexto que envía al agente |
|---|---|
| Home | Popularidad + destacados |
| `/buscar` | `query` de búsqueda |
| `/categoria/:slug` | `categoryId` |
| `/producto/:id` | `productId` + `categoryId` |
| `/carrito` | `cartCodes` (contenido del carrito) |

Componente: `app-product-recommendations`  
Servicio: `RecommendationAgentService`

---

## 7. Cómo defenderlo ante la terna (1 minuto)

> "Implementamos un agente de recomendación propio, alineado al alcance punto 13. No depende de APIs externas de pago, conforme a la limitación 9. El agente combina tres entradas del documento: la consulta del cliente, la categoría del producto y las relaciones entre artículos, aprendidas de las cotizaciones reales de Ferromaderas. Clasifica sugerencias como complementos o alternativas para favorecer la venta cruzada y reducir el tiempo de búsqueda."

---

## 8. Archivos en el código

**Backend**
- `src/modules/recommendation-agent/recommendation-agent.service.ts` — motor híbrido
- `src/modules/recommendation-agent/recommendation-agent.controller.ts` — API pública
- `src/modules/recommendation-agent/recommendation-agent.types.ts` — tipos

**Frontend**
- `src/app/core/services/recommendation-agent.service.ts`
- `src/app/shared/components/product-recommendations/`

Por qué cuenta como agente de IA según tu doc:

Un agente percibe → razona → actúa:

Percibe: consulta, categoría, producto, carrito
Razona: combina señales con pesos y patrones de cotización
Actúa: devuelve sugerencias tipadas con explicación
