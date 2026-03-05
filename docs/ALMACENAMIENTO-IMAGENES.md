# Almacenamiento de imágenes

Recomendaciones para guardar imágenes (fotos de perfil, productos, etc.) sin complicar el servidor.

---

## Opciones recomendadas

### 1. **Supabase Storage** (recomendado para empezar)

- **Pros:** Simple, gratis hasta 1GB, API sencilla, dashboard web
- **Contras:** Dependes de Supabase (si no usas su DB, igual puedes usar solo Storage)
- **Setup:** ~15 min

```bash
npm install @supabase/supabase-js
```

**Variables de entorno:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Service role (no anon key)
```

**Uso básico:**
```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Subir
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/foto.jpg`, fileBuffer, { contentType: 'image/jpeg' });

// URL pública
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/foto.jpg`);
```

---

### 2. **AWS S3**

- **Pros:** Estándar de industria, muy confiable, escalable
- **Contras:** Más configuración (IAM, buckets, policies)
- **Setup:** ~30–45 min

```bash
npm install @aws-sdk/client-s3
```

**Variables:**
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=ferromaderas-imagenes
```

---

### 3. **Cloudflare R2**

- **Pros:** Compatible con S3, sin egress fees, buen precio
- **Contras:** Similar complejidad a S3

---

### 4. **Vercel Blob** (si usas Vercel)

- **Pros:** Muy simple, integrado con Vercel
- **Contras:** Solo si despliegas en Vercel

---

## Recomendación para Ferromaderas

**Supabase Storage** es la opción más sencilla para empezar:

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear proyecto → Storage → New bucket
3. Configurar políticas (público para lectura, solo autenticados para subir)
4. Usar la API en el backend NestJS

---

## Flujo de datos

1. **Frontend:** Usuario selecciona imagen → sube al backend (multipart/form-data)
2. **Backend:** Recibe el archivo → sube a Supabase/S3 → guarda la URL en la BD
3. **Frontend:** Muestra la imagen usando la URL pública

---

## Sobre JWT_SECRET

**Importante:** `JWT_SECRET` NO es por usuario. Es un **secreto único para toda la aplicación** que se usa para firmar TODOS los tokens.

- **JWT_SECRET:** Una sola variable de entorno (ej: `mi-clave-super-secreta-2024`)
- **Expiración:** 7 días es el tiempo de vida del **token** (ej: recuperar contraseña), no del secret

El secret debe ser único, largo y aleatorio. No rotarlo por usuario.
