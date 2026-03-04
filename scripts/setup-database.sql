-- ============================================================================
-- Setup base de datos Ferromaderas
-- Ejecutar en pgAdmin conectado como postgres (superusuario)
-- ============================================================================

-- PASO 1: Ejecutar esto en la base "postgres" (por defecto)
-- Si la BD o el usuario ya existen, algunos comandos darán error; ignóralos.
-- ----------------------------------------------------------------------------

CREATE DATABASE ferromaderas;

CREATE USER ferromaderas_user WITH PASSWORD 'Ferromaderas2026%';

GRANT CONNECT ON DATABASE ferromaderas TO ferromaderas_user;

-- Si ferromaderas_user ya existía, ejecuta solo esto para actualizar la contraseña:
-- ALTER USER ferromaderas_user WITH PASSWORD 'Ferromaderas2026%';
