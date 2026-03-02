-- ============================================================================
-- Verificar y reparar usuario admin - Ejecutar en pgAdmin (base ferromaderas)
-- ============================================================================

-- 1. Verificar si existe el usuario admin
SELECT id, username, email, name, status, role_id, 
       LEFT(password_hash, 20) as hash_preview
FROM users 
WHERE username = 'admin' OR email = 'admin@ferromaderas.com';

-- 2. Si NO hay filas: el usuario no existe. Ejecutar el INSERT de create-tables-users.sql
--    o crear manualmente (requiere rol administrador):

-- Primero obtener el role_id del administrador
-- SELECT id FROM roles WHERE slug = 'administrador';

-- Si necesitas crear el admin desde cero (reemplaza ROLE_ID_UUID por el id real):
/*
INSERT INTO users (email, username, password_hash, name, status, role_id)
SELECT
  'admin@ferromaderas.com',
  'admin',
  crypt('Admin123!', gen_salt('bf')),
  'Administrador',
  'activo',
  id
FROM roles WHERE slug = 'administrador'
ON CONFLICT (email) DO NOTHING;
*/

-- 3. El hash de pgcrypto a veces no es compatible con Node bcrypt.
--    MEJOR OPCIÓN: ejecutar en la terminal del proyecto API:
--    npm run reset-admin-password
--
--    Eso actualiza la contraseña con un hash que Node reconoce.
