# Bitácora del sistema

Tabla única para auditoría de todo el sistema. Registra acciones de usuarios y procesos automáticos.

## Tabla bitacora

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| fecha | timestamp | Fecha y hora del evento |
| modulo | text | Módulo: productos, usuarios, auth, inventario_sync, etc. |
| accion | text | Acción: crear, actualizar, eliminar, sincronizar, carga_masiva, etc. |
| usuario_id | UUID (nullable) | Usuario que realizó la acción (null si fue proceso automático) |
| detalles | jsonb | Datos adicionales (creados, actualizados, ip, etc.) |
| ip | text (nullable) | Dirección IP del cliente |

## Uso actual

- **inventario_sync / carga_masiva**: Cada ejecución del bulk import (admin o .exe) registra: creados, actualizados, desactivados, origen (admin o sincronizacion_automatica).

## Extender a otros módulos

Para registrar en otros puntos del sistema:

```typescript
await this.bitacora.registrar({
  modulo: 'usuarios',
  accion: 'crear',
  usuarioId: currentUser.id,
  ip: req.ip,
  detalles: { userId: newUser.id, username: newUser.username },
});
```

## Consultar la bitácora

Por ahora se consulta directamente en la base de datos. Ejemplo:

```sql
SELECT * FROM bitacora ORDER BY fecha DESC LIMIT 100;
SELECT * FROM bitacora WHERE modulo = 'inventario_sync' ORDER BY fecha DESC;
```
