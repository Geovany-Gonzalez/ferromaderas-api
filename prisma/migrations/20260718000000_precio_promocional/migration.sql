-- Precio promocional opcional en productos (alcance: módulo de promociones comerciales).
ALTER TABLE "productos"
ADD COLUMN IF NOT EXISTS "precio_promocional" DECIMAL(10, 2);
