-- Migración: guardar solo dígitos en teléfono (sin +502)
-- Ejecutar una vez si ya tienes datos con formato "+502 58226530"

UPDATE usuarios
SET phone = regexp_replace(regexp_replace(phone, '\+502\s*', '', 'g'), '[^0-9]', '', 'g')
WHERE phone IS NOT NULL AND phone != ''
  AND (phone ~ '\+502' OR phone ~ '[^0-9]');
