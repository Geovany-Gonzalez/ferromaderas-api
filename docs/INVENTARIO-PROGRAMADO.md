# Sincronización de inventario on-site (Ferromaderas)

Alineado al alcance del PG: actualización automática de existencias desde el reporte Excel de Dichara hacia la API en la nube.

## Arquitectura

```
PC Ferromaderas (Windows)
  └── Carpeta C:\Inventario\  (*.xlsx exportados de Dichara)
        └── ferromaderas-inventory-sync.exe  (Programador de tareas: 8:00, 12:00, 17:00)
              └── POST /api/products/bulk-sync  (API en la nube, X-API-Key)
                    └── PostgreSQL (tabla productos.existencia)
                    └── bitácora (modulo: inventario_sync)
```

## Requisitos previos

1. API desplegada y accesible desde la PC de Ferromaderas.
2. Variable `INVENTORY_SYNC_API_KEY` configurada en el `.env` de la API (misma clave que usará el `.exe`).
3. Carpeta local donde Dichara exporta el Excel (ej. `C:\Inventario`).

## Paso 1 — Configurar la API

En `feromaderas-api/.env`:

```env
INVENTORY_SYNC_API_KEY=clave-secreta-larga-y-unica
```

Reiniciar la API después de agregar la clave.

## Paso 2 — Preparar el sync en la PC de Ferromaderas

En el repositorio `ferromaderas-inventory-sync`:

```bash
npm install
npm run exe
```

Esto genera `dist/ferromaderas-inventory-sync.exe`.

Copiar a la PC de Ferromaderas:

| Archivo | Destino sugerido |
|---|---|
| `dist/ferromaderas-inventory-sync.exe` | `C:\Ferromaderas\sync\` |
| `config.json` (copiar de `config.example.json`) | `C:\Ferromaderas\sync\` |
| `run-sync.bat` (copiar de `run-sync.bat.example`) | `C:\Ferromaderas\sync\` |

### config.json

```json
{
  "apiUrl": "https://tu-dominio-ferromaderas.com",
  "folderPath": "C:\\Inventario",
  "sync": false
}
```

- `apiUrl`: URL base de la API (sin `/api` al final).
- `folderPath`: carpeta donde caen los `.xlsx` de Dichara.
- `sync`: `false` = solo actualiza existencias; `true` = también desactiva productos que no vengan en el Excel.

### run-sync.bat

```bat
@echo off
set API_KEY=clave-secreta-larga-y-unica
cd /d C:\Ferromaderas\sync
ferromaderas-inventory-sync.exe
```

La clave va en la variable de entorno, no en `config.json` (más seguro).

## Paso 3 — Programador de tareas de Windows

1. Abrir **Programador de tareas** → **Crear tarea básica**.
2. Nombre: `Ferromaderas Sync Inventario`.
3. Desencadenador: **Diariamente**, repetir a las **8:00**, **12:00** y **17:00** (crear 3 tareas o una con 3 desencadenadores).
4. Acción: **Iniciar un programa** → `C:\Ferromaderas\sync\run-sync.bat`.
5. Marcar **Ejecutar con los privilegios más altos** si la carpeta de inventario requiere permisos elevados.

## Paso 4 — Verificar

1. Colocar un `.xlsx` de prueba en `C:\Inventario`.
2. Ejecutar `run-sync.bat` manualmente.
3. Revisar:
   - Consola / `logs/sync-YYYY-MM-DD.log` en la carpeta del sync.
   - Admin → **Bitácora** → filtro **Inventario (sync)**.
   - Admin → **Productos** → existencias actualizadas.

Los archivos procesados se mueven a `C:\Inventario\procesados\`.

## Endpoint (referencia técnica)

```
POST /api/products/bulk-sync
X-API-Key: <INVENTORY_SYNC_API_KEY>
Content-Type: application/json

{ "items": [{ "code": "...", "name": "...", "stock": 0 }], "sync": false }
```

## Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `API 401` | Clave incorrecta | Igualar `INVENTORY_SYNC_API_KEY` y `API_KEY` en `run-sync.bat` |
| `API 403` | Clave ausente | Verificar header `X-API-Key` |
| Carpeta no existe | Ruta mal configurada | Crear `C:\Inventario` o corregir `folderPath` |
| Sin productos válidos | Excel sin columnas código/descripción | Verificar formato Dichara |
| Archivo no se mueve | Error en el sync | Revisar `logs/sync-*.log`; el archivo con error se deja en la carpeta |

## Desarrollo local

```bash
# Terminal 1 — API
cd feromaderas-api && npm run start:dev

# Terminal 2 — sync (sin .exe)
cd ferromaderas-inventory-sync
# Crear config.json con apiUrl: http://localhost:3001
set API_KEY=tu-clave-local
npm run sync
```
