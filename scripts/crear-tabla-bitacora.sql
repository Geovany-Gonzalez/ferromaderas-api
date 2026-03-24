-- Tabla bitácora para auditoría del sistema
CREATE TABLE IF NOT EXISTS bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modulo TEXT NOT NULL,
  accion TEXT NOT NULL,
  usuario_id UUID,
  detalles JSONB,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora(fecha);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo ON bitacora(modulo);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo_fecha ON bitacora(modulo, fecha);
