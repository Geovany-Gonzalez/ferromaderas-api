# Justificación del uso del schema `public`

## ¿Por qué usamos el schema `public`?

En PostgreSQL, `public` es el schema por defecto. Todas las bases de datos nuevas crean este schema automáticamente.

### Para nuestro proyecto (Ferromaderas) es adecuado porque:

1. **Proyecto único**: Una sola aplicación (API + panel admin) usa la base de datos. No hay necesidad de separar objetos por módulos.

2. **Simplicidad**: Es el estándar en la mayoría de proyectos web. No requiere configuración adicional.

3. **Compatibilidad**: Prisma, ORMs y herramientas asumen `public` por defecto. Menos configuración = menos errores.

4. **Escalabilidad suficiente**: Si en el futuro se necesita multi-tenant o varios módulos, se puede migrar a schemas propios (ej. `ferromaderas`, `app`).

### ¿Cuándo usar un schema propio?

- Varias aplicaciones comparten la misma base de datos
- Multi-tenant con aislamiento por schema
- Proyectos grandes con muchos módulos

### Conclusión

Para Ferromaderas, `public` es una **buena práctica** porque es simple, estándar y adecuado al tamaño del proyecto.
