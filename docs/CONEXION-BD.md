# Solución: Database connection failed

Si la API muestra "Database connection failed" o el login no funciona:

## 1. Probar con usuario postgres

Si `ferromaderas_user` da "Authentication failed", prueba con el usuario **postgres**:

Edita `.env`:
```
DATABASE_URL="postgresql://postgres:TU_PASSWORD_DE_POSTGRES@localhost:5432/ferromaderas"
```

(Reemplaza `TU_PASSWORD_DE_POSTGRES` por la contraseña que usas en pgAdmin para conectarte.)

## 2. Verificar que PostgreSQL esté corriendo

- Puerto 5432 debe estar abierto
- El servicio PostgreSQL debe estar activo

## 3. Verificar permisos del usuario

El usuario debe tener acceso a la base `ferromaderas`. En pgAdmin, conectado como postgres:

```sql
GRANT ALL PRIVILEGES ON DATABASE ferromaderas TO ferromaderas_user;
GRANT ALL ON SCHEMA public TO ferromaderas_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ferromaderas_user;
```

## 4. Después de conectar

1. Reinicia la API (`npm run start:dev`)
2. Ejecuta `npm run reset-admin-password` para asegurar el hash de la contraseña
3. Login: **admin** / **Admin123!**
