-- ============================================================================
-- Datos iniciales Ferromaderas - Ejecutar DESPUÉS de crear-tablas-cloud.sql
-- ============================================================================

-- Permisos
INSERT INTO "permisos" ("id", "slug", "name") VALUES
  (gen_random_uuid(), 'manage_products', 'Gestionar productos'),
  (gen_random_uuid(), 'manage_categories', 'Gestionar categorías'),
  (gen_random_uuid(), 'manage_featured', 'Gestionar destacados'),
  (gen_random_uuid(), 'view_quotes', 'Ver cotizaciones y cambiar estado'),
  (gen_random_uuid(), 'manage_users', 'Crear usuarios / Resetear contraseñas');

-- Roles
INSERT INTO "roles" ("id", "slug", "name") VALUES
  (gen_random_uuid(), 'vendedor', 'Vendedor'),
  (gen_random_uuid(), 'administrador', 'Administrador');

-- Rol-Permisos (vendedor solo view_quotes, administrador todos)
INSERT INTO "rol_permisos" ("rol_id", "permiso_id")
SELECT r.id, p.id FROM "roles" r, "permisos" p
WHERE r.slug = 'vendedor' AND p.slug = 'view_quotes';

INSERT INTO "rol_permisos" ("rol_id", "permiso_id")
SELECT r.id, p.id FROM "roles" r, "permisos" p
WHERE r.slug = 'administrador';

-- Usuario admin (contraseña: Admin123!)
INSERT INTO "usuarios" ("id", "email", "username", "password_hash", "name", "status", "rol_id")
SELECT
  gen_random_uuid(),
  'geovanygonzalez2103@gmail.com',
  'admin',
  '$2b$10$hW4y3PzILNQCK2FNacPUqeCn6NK9oNr8Va5q0Xxe.mhejghKO85o.',
  'Administrador',
  'activo',
  r.id
FROM "roles" r WHERE r.slug = 'administrador';
