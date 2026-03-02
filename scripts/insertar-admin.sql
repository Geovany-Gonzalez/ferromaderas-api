-- ============================================================================
-- Crear/recrear usuario admin - Ejecutar en pgAdmin (base ferromaderas)
-- ============================================================================
-- Si el login no funciona, puede ser por hash incompatible (pgcrypto vs bcrypt).
-- Ejecuta esto y LUEGO en la terminal: npm run reset-admin-password

-- Eliminar admin existente (para reinsertar con hash correcto vía Node)
DELETE FROM users WHERE username = 'admin' OR email = 'admin@ferromaderas.com';

-- Insertar admin (el hash de pgcrypto a veces falla con Node; usa reset-admin-password)
INSERT INTO users (email, username, password_hash, name, status, role_id)
SELECT
  'admin@ferromaderas.com',
  'admin',
  crypt('Admin123!', gen_salt('bf')),
  'Administrador',
  'activo',
  r.id
FROM roles r
WHERE r.slug = 'administrador';

-- IMPORTANTE: Después ejecuta en la carpeta feromaderas-api:
--   npm run reset-admin-password
-- Eso actualiza el hash a uno que Node bcrypt reconoce.
