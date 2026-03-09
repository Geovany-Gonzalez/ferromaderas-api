# Tabla productos - Estructura y columnas

## Columnas actuales

La tabla `productos` tiene las siguientes columnas (después de `prisma db push`):

| Columna        | Tipo      | Descripción                          |
|----------------|-----------|--------------------------------------|
| id             | uuid      | Identificador único                  |
| codigo         | text      | Código del producto (único, ej. 1001)|
| name           | text      | Nombre del producto                  |
| description    | text      | Descripción (opcional)               |
| price          | numeric   | Precio (10,2)                        |
| imagen_url     | text      | URL de la imagen (opcional)          |
| categoria_id   | uuid      | FK a categorías (opcional)          |
| **activo**     | boolean   | Estado lógico (true=activo, false=inactivo) |
| destacado      | boolean   | Si aparece en destacados             |
| pendiente_config | boolean | Falta foto, precio o categoría       |
| existencia     | integer   | Stock / inventario teórico           |
| creado_en      | timestamp | Fecha de creación                   |
| actualizado_en | timestamp | Última actualización                |

## Estado lógico (activo)

- **activo = true**: Producto visible en catálogo público
- **activo = false**: Producto desactivado (eliminación lógica, no se borra de la BD)

## Importante: Frontend usa localStorage

Actualmente el **admin de productos** guarda los datos en `localStorage` del navegador, **no en la base de datos**. Por eso:

- Los productos que ves en el admin están solo en el navegador
- La tabla `productos` en PostgreSQL está vacía hasta que conectes el frontend a la API

Para que los productos se guarden en la BD, hay que conectar el `CatalogService` del frontend con los endpoints de productos de la API.
