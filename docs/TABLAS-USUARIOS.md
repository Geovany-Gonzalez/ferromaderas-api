# Tablas para el sistema de usuarios

Las tablas se crean **automáticamente** al ejecutar `npm run prisma:migrate`. No tienes que crearlas manualmente en pgAdmin.

Prisma genera el SQL y las ejecuta contra tu base `ferromaderas` usando el usuario `ferromaderas_user`.

---

## Tablas que se crearán

### 1. `roles`
| Columna     | Tipo     | Descripción                        |
|-------------|----------|------------------------------------|
| id          | UUID     | PK                                 |
| slug        | VARCHAR  | UNIQUE: vendedor, administrador    |
| name        | VARCHAR  | Nombre del rol                     |
| created_at  | TIMESTAMP| Fecha de creación                  |

### 2. `permissions`
| Columna | Tipo    | Descripción                                        |
|---------|---------|----------------------------------------------------|
| id      | UUID    | PK                                                 |
| slug    | VARCHAR | UNIQUE                                             |
| name    | VARCHAR | Nombre legible                                     |

**Permisos iniciales (del seed):**
- `manage_products` - Gestionar productos
- `manage_categories` - Gestionar categorías
- `manage_featured` - Gestionar destacados
- `view_quotes` - Ver cotizaciones y cambiar estado
- `manage_users` - Crear usuarios / Resetear contraseñas

### 3. `role_permissions`
| Columna      | Tipo   | Descripción |
|--------------|--------|-------------|
| role_id      | UUID   | FK → roles  |
| permission_id| UUID   | FK → permissions |

Tabla de enlace: qué permisos tiene cada rol.

### 4. `users`
| Columna       | Tipo     | Descripción                    |
|---------------|----------|--------------------------------|
| id            | UUID     | PK                             |
| email         | VARCHAR  | UNIQUE                         |
| username      | VARCHAR  | UNIQUE                         |
| password_hash | VARCHAR  | Contraseña hasheada (bcrypt)   |
| name          | VARCHAR  | Nombre completo                |
| phone         | VARCHAR  | Opcional                       |
| profile_image | VARCHAR  | Opcional, URL de foto          |
| status        | VARCHAR  | activo \| inactivo             |
| last_login_at | TIMESTAMP| Último inicio de sesión        |
| created_at    | TIMESTAMP| Fecha de creación              |
| updated_at    | TIMESTAMP| Última actualización           |
| role_id       | UUID     | FK → roles                     |

---

## Cómo aplicar las tablas

1. **Crea un `.env`** con tu conexión:
   ```
   DATABASE_URL="postgresql://ferromaderas_user:Ferromaderas2026%25@localhost:5432/ferromaderas"
   ```

2. **Ejecuta las migraciones:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

El seed crea:
- Roles: vendedor, administrador
- Permisos: los 5 anteriores
- Asignación vendedor → solo `view_quotes`
- Asignación administrador → todos los permisos
- Usuario: `admin` / `Admin123!`
