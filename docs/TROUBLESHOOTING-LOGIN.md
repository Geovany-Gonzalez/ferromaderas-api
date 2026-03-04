# Solución: No puedo hacer login

## 1. Arreglar errores de TypeScript (Prisma)

Los errores de `status`, `passwordHash` y `role` suelen deberse a un **cliente Prisma desactualizado**.

**Pasos:**
1. **Detén la API** (Ctrl+C en la terminal donde corre `npm run start:dev`)
2. Ejecuta:
   ```bash
   npx prisma generate
   ```
3. Vuelve a iniciar la API:
   ```bash
   npm run start:dev
   ```

---

## 2. Contraseña del admin no funciona

Si creaste el usuario con el script SQL (`create-tables-users.sql`), el hash se generó con **pgcrypto** de PostgreSQL. A veces no es compatible con **Node bcrypt**.

**Solución:** actualizar la contraseña con un hash de Node:
```bash
npm run reset-admin-password
```

Luego intenta de nuevo: **admin** / **Admin123!**

---

## 3. Verificar que el usuario existe

En pgAdmin, ejecuta:
```sql
SELECT id, username, email, status, role_id FROM users WHERE username = 'admin';
```

Si no hay filas, crea el usuario con:
```bash
npm run prisma:seed
```
(o vuelve a ejecutar el INSERT del script SQL)

---

## 4. API en el puerto correcto

El frontend apunta a `http://localhost:3001/api`. Verifica en tu `.env`:
```
PORT=3001
```

Si la API corre en otro puerto, cambia `environment.apiUrl` en el frontend o ajusta `PORT`.
