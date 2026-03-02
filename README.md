# Ferromaderas API

API REST construida con **NestJS**, **TypeScript**, **Prisma** y **PostgreSQL**.  
Consumida por el frontend Angular en `../ferromaderas-frontend`.

## Tecnologías

- **NestJS** – Framework Node.js
- **TypeScript** – Tipado estático
- **Prisma** – ORM para PostgreSQL
- **PostgreSQL** – Base de datos
- **Google Analytics Data API** – Estadísticas GA4 (GTM)

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- Cuenta Google Cloud con GA4 (para estadísticas en tiempo real)

## Instalación

### 1. Crear la base de datos en PostgreSQL

```sql
-- En psql como postgres:
CREATE DATABASE ferromaderas;
```

O ejecutar `scripts/create-db.sql`.

### 2. Configurar entorno

```bash
npm install
cp .env.example .env
# Editar .env con tu DATABASE_URL, por ejemplo:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ferromaderas"
```

### 3. Ejecutar migraciones y seed

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

El seed crea roles (vendedor, administrador), permisos y usuario admin:
- **Usuario:** `admin@ferromaderas.com` o `admin`
- **Contraseña:** `Admin123!`

Si usaste el script SQL y el login no funciona (hash pgcrypto vs bcrypt):
```bash
npm run reset-admin-password
```

## Ejecución

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado de la API y BD |
| GET | `/api/statistics/dashboard` | Estadísticas del sitio (GA4) para el dashboard |
| GET | `/api/statistics/summary` | Métricas resumidas |

## Configuración GA4

Para usar estadísticas reales de Google Analytics 4 (recogidas vía GTM en el frontend):

1. **Crear cuenta de servicio** en [Google Cloud Console](https://console.cloud.google.com) → APIs y servicios → Credenciales.
2. **Activar** Google Analytics Data API.
3. **Dar acceso** a la cuenta de servicio en GA4 (Admin → Acceso a la propiedad).
4. **Configurar** en `.env`:
   - `GA4_PROPERTY_ID`: ID numérico de la propiedad GA4 (ej: `123456789`)
   - `GOOGLE_APPLICATION_CREDENTIALS`: ruta al JSON de la cuenta de servicio

Si no se configura GA4, los endpoints de estadísticas devuelven datos de ejemplo compatibles con el dashboard.

## Estructura del proyecto

```
src/
├── core/                 # Módulo global (BD, health)
├── modules/
│   ├── statistics/       # Estadísticas GA4/GTM ✅
│   ├── users/            # Usuarios (futuro)
│   └── products/         # Productos (futuro)
├── app.module.ts
└── main.ts
```

## CORS

Por defecto se permite `http://localhost:4200` (frontend Angular). Para producción, ajustar `CORS_ORIGIN` en `.env`.
