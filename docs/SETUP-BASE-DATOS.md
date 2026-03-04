# Setup de base de datos Ferromaderas

## Paso 1: Crear base de datos y usuario (pgAdmin)

1. Abre **pgAdmin** y conéctate como **postgres** (superusuario).
2. Abre **Query Tool** sobre la base `postgres`.
3. Ejecuta el contenido de `scripts/setup-database.sql`:
   - Crea la base `ferromaderas`
   - Crea el usuario `ferromaderas_user` con contraseña `Ferromaderas2026%`
   - Da permisos de conexión

4. Si la base `ferromaderas` ya existe, conéctate a ella.
5. Abre **Query Tool** sobre la base `ferromaderas`.
6. Ejecuta el contenido de `scripts/setup-database-grants.sql` (permisos sobre tablas).

**Si el usuario ya existía** y solo necesitas actualizar la contraseña:
```sql
ALTER USER ferromaderas_user WITH PASSWORD 'Ferromaderas2026%';
```

## Paso 2: Crear tablas (Prisma)

En la carpeta `feromaderas-api`:

```bash
npx prisma migrate dev --name init
```

Esto crea las tablas según el schema.

## Paso 3: Datos iniciales (seed)

```bash
npm run prisma:seed
```

Crea roles (vendedor, administrador), permisos y usuario admin.

## Tablas creadas

| Tabla | Descripción |
|-------|-------------|
| `roles` | roles (vendedor, administrador) |
| `permissions` | permisos (manage_products, etc.) |
| `role_permissions` | relación roles-permisos |
| `users` | usuarios del sistema |
| `categories` | categorías de productos |
| `products` | productos |

## Credenciales admin

- **Usuario:** admin
- **Contraseña:** Admin123!

## Usar conexión postgres

Si prefieres usar el usuario `postgres`, cambia en `.env`:

```
DATABASE_URL="postgresql://postgres:TU_PASSWORD_POSTGRES@localhost:5432/ferromaderas?schema=public"
```

Si la contraseña tiene `%`, escríbela como `%25`.
