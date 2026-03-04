# Configuración de correo electrónico

Los correos se usan para:
- **Recuperar contraseña** (olvidé mi contraseña)
- **Enviar credenciales** al crear un nuevo usuario

## Dónde configurar

Edita el archivo **`.env`** en la raíz del proyecto `feromaderas-api` (junto a `package.json`).

## Parámetros necesarios

```env
# URL del frontend (para enlaces en los correos)
FRONTEND_URL=http://localhost:4200

# Servidor SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_contraseña_de_aplicacion
MAIL_FROM=noreply@ferromaderas.com
```

### Gmail

1. Activa la verificación en 2 pasos en tu cuenta Google.
2. Ve a [Contraseñas de aplicaciones](https://myaccount.google.com/apppasswords).
3. Crea una contraseña para "Correo" o "Otro".
4. Usa esa contraseña en `SMTP_PASS`.

### Otros proveedores

| Proveedor | SMTP_HOST | SMTP_PORT |
|-----------|-----------|-----------|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp.office365.com | 587 |
| Yahoo | smtp.mail.yahoo.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |

## Sin configuración

Si no configuras SMTP, la API sigue funcionando pero **no enviará correos**. Los mensajes se registrarán en la consola y, en desarrollo, se mostrará el enlace para cambiar contraseña.
