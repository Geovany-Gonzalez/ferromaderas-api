-- Ejecutar en PostgreSQL como superusuario (postgres)
-- psql -U postgres -f scripts/create-db.sql

-- Crear base de datos
CREATE DATABASE ferromaderas;

-- Usuario dedicado
CREATE USER ferromaderas_user WITH PASSWORD 'Ferromaderas2026%';
GRANT ALL PRIVILEGES ON DATABASE ferromaderas TO ferromaderas_user;

-- Conectar a ferromaderas y dar permisos (ejecutar con \c ferromaderas o desde pgAdmin conectado a ferromaderas)
\c ferromaderas
GRANT ALL ON SCHEMA public TO ferromaderas_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ferromaderas_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ferromaderas_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ferromaderas_user;
