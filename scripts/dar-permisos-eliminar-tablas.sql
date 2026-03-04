-- Ejecutar en pgAdmin como postgres, sobre la base ferromaderas
-- Da ownership de TODAS las tablas del schema public a ferromaderas_user
-- Así ferromaderas_user podrá eliminarlas con prisma db push --force-reset

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE format('ALTER TABLE %I OWNER TO ferromaderas_user', r.tablename);
  END LOOP;
END $$;
