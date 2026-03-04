-- ============================================================================
-- Script de tablas para sistema de usuarios - Ferromaderas
-- Ejecutar en pgAdmin conectado a la base de datos 'ferromaderas'
-- ============================================================================

-- Habilitar extensión para hashear contraseñas (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tabla roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Roles del sistema: vendedor, administrador';

-- ----------------------------------------------------------------------------
-- 2. Tabla permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL
);

COMMENT ON TABLE permissions IS 'Permisos: manage_products, manage_categories, etc.';

-- ----------------------------------------------------------------------------
-- 3. Tabla role_permissions (enlace roles-permisos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ----------------------------------------------------------------------------
-- 4. Tabla users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  profile_image VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role_id UUID NOT NULL REFERENCES roles(id)
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

COMMENT ON TABLE users IS 'Usuarios del sistema admin';

-- ----------------------------------------------------------------------------
-- DATOS INICIALES
-- ----------------------------------------------------------------------------

-- Permisos
INSERT INTO permissions (id, slug, name) VALUES
  (gen_random_uuid(), 'manage_products', 'Gestionar productos'),
  (gen_random_uuid(), 'manage_categories', 'Gestionar categorías'),
  (gen_random_uuid(), 'manage_featured', 'Gestionar destacados'),
  (gen_random_uuid(), 'view_quotes', 'Ver cotizaciones y cambiar estado'),
  (gen_random_uuid(), 'manage_users', 'Crear usuarios / Resetear contraseñas')
ON CONFLICT (slug) DO NOTHING;

-- Roles
INSERT INTO roles (id, slug, name) VALUES
  (gen_random_uuid(), 'vendedor', 'Vendedor'),
  (gen_random_uuid(), 'administrador', 'Administrador')
ON CONFLICT (slug) DO NOTHING;

-- Asignar permisos a VENDEDOR (solo view_quotes)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'vendedor' AND p.slug = 'view_quotes'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar TODOS los permisos a ADMINISTRADOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Usuario admin (contraseña: Admin123!)
-- Usa pgcrypto para hash bcrypt
INSERT INTO users (email, username, password_hash, name, status, role_id)
SELECT
  'admin@ferromaderas.com',
  'admin',
  crypt('Admin123!', gen_salt('bf')),
  'Administrador',
  'activo',
  r.id
FROM roles r
WHERE r.slug = 'administrador'
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Trigger para updated_at en users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Listo. Usuario creado: admin / Admin123!
-- ============================================================================
