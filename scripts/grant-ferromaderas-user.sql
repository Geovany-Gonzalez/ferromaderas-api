-- Dar permisos completos a ferromaderas_user en la base ferromaderas
-- Ejecutar como postgres, conectado a la base ferromaderas

GRANT ALL ON SCHEMA public TO ferromaderas_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ferromaderas_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ferromaderas_user;
GRANT USAGE ON SCHEMA public TO ferromaderas_user;
