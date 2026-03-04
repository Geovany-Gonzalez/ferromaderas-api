-- Ejecutar en pgAdmin como postgres, sobre la base ferromaderas
-- Borra todas las tablas para que Prisma pueda recrearlas

DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
DROP TABLE IF EXISTS "rol_permisos" CASCADE;
DROP TABLE IF EXISTS "usuarios" CASCADE;
DROP TABLE IF EXISTS "permisos" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;
DROP TABLE IF EXISTS "productos" CASCADE;
DROP TABLE IF EXISTS "categorias" CASCADE;
