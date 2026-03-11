# Endpoint de sincronización de inventario

Para el .exe local que lee el Excel y actualiza el inventario.

```
POST /api/products/bulk-sync
X-API-Key: <INVENTORY_SYNC_API_KEY>
Content-Type: application/json

{ "items": [{ "code": "...", "name": "...", "stock": 0 }], "sync": false }
```

Configurar `INVENTORY_SYNC_API_KEY` en el .env de la API.
