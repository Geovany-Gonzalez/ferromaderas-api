-- Historial de seguimiento comercial (Cap. III §3.4.3)
CREATE TABLE IF NOT EXISTS "seguimiento_cotizacion" (
    "id" TEXT NOT NULL,
    "cotizacion_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'cambio_estado',
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT,
    "comentario" TEXT,
    "usuario_id" TEXT,
    "usuario_nombre" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimiento_cotizacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "seguimiento_cotizacion_cotizacion_id_idx"
    ON "seguimiento_cotizacion"("cotizacion_id");

ALTER TABLE "seguimiento_cotizacion"
    ADD CONSTRAINT "seguimiento_cotizacion_cotizacion_id_fkey"
    FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cotizaciones"
    ADD COLUMN IF NOT EXISTS "cliente_registrado_id" TEXT;

CREATE INDEX IF NOT EXISTS "cotizaciones_cliente_registrado_id_idx"
    ON "cotizaciones"("cliente_registrado_id");

CREATE INDEX IF NOT EXISTS "cotizaciones_cliente_email_idx"
    ON "cotizaciones"("cliente_email");
