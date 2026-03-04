-- ============================================================================
-- Permisos del usuario ferromaderas_user
-- Ejecutar en pgAdmin sobre la base "ferromaderas"
-- (Click derecho en ferromaderas → Query Tool)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO ferromaderas_user;
GRANT CREATE ON SCHEMA public TO ferromaderas_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ferromaderas_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ferromaderas_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ferromaderas_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ferromaderas_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ferromaderas_user;
