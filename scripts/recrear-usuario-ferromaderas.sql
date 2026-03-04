-- Ejecutar en pgAdmin como postgres (sobre la base postgres o ferromaderas)
-- Recrea ferromaderas_user con contraseña Ferromaderas2026

DROP USER IF EXISTS ferromaderas_user;

CREATE USER ferromaderas_user WITH PASSWORD 'Ferromaderas2026';

GRANT CONNECT ON DATABASE ferromaderas TO ferromaderas_user;
