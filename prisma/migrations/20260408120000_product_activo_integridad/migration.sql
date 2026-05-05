-- Integridad alineada con ProductsService.canBeActive:
-- Si activo = true, el producto debe tener precio > 0, categoría, imagen no vacía y no estar pendiente de configurar.
--
-- NOT VALID: no revalida filas ya existentes (puede haber datos legacy); las nuevas filas y los UPDATE sí deben cumplir.
-- Cuando quieras endurecer la BD, ejecuta: ALTER TABLE "productos" VALIDATE CONSTRAINT "productos_activo_requiere_catalogo";
-- (fallará si aún hay filas inconsistentes; corrígelas antes.)

ALTER TABLE "productos" ADD CONSTRAINT "productos_activo_requiere_catalogo"
CHECK (
  "activo" = false OR (
    "pendiente_config" = false
    AND "price" > 0
    AND "categoria_id" IS NOT NULL
    AND "imagen_url" IS NOT NULL
    AND LENGTH(TRIM("imagen_url")) > 0
  )
) NOT VALID;
