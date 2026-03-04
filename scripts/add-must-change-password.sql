-- Ejecutar cuando la BD esté disponible
-- Agrega la columna must_change_password para obligar al usuario a cambiar contraseña
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;
