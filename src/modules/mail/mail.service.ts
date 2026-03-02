import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 587,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  private get from(): string {
    return this.config.get<string>('MAIL_FROM') ?? 'noreply@ferromaderas.com';
  }

  private emailTemplate(title: string, body: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ferromaderas</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:#1e3a8a;padding:24px;text-align:center;">
              <span style="color:white;font-size:20px;font-weight:700;">Ferro</span><span style="color:#f59e0b;font-size:20px;font-weight:700;">Maderas</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;color:#334155;line-height:1.6;">
              ${title}
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;text-align:center;color:#64748b;font-size:12px;">
              © ${new Date().getFullYear()} Ferromaderas. Todos los derechos reservados.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    if (!this.transporter) {
      console.warn('[MailService] SMTP no configurado. Email no enviado:', { to, subject });
      return true; // No fallar en desarrollo
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html: html ?? text.replace(/\n/g, '<br>'),
      });
      return true;
    } catch (err) {
      console.error('[MailService] Error enviando email:', err);
      throw err;
    }
  }

  async sendCredentials(
    to: string,
    username: string,
    password: string,
    changePasswordUrl: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('[MailService] SMTP no configurado. Enlace para cambiar contraseña:', changePasswordUrl);
    }
    const subject = 'Credenciales - Ferromaderas Admin';
    const text = `Hola,\n\nTu usuario ha sido creado en el sistema Ferromaderas.\n\nUsuario: ${username}\nContraseña temporal: ${password}\n\nDebes cambiar tu contraseña antes de poder iniciar sesión. Haz clic en el siguiente enlace:\n${changePasswordUrl}\n\n— Ferromaderas`;
    const html = this.emailTemplate(
      '<p>Hola,</p><p>Tu usuario ha sido creado en el sistema <strong>Ferromaderas</strong>.</p>',
      `
        <p><strong>Usuario:</strong> <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;">${username}</code></p>
        <p><strong>Contraseña temporal:</strong> <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;">${password}</code></p>
        <p>Debes cambiar tu contraseña antes de poder iniciar sesión. Haz clic en el botón:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${changePasswordUrl}" style="background:#1e3a8a;color:white!important;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">Cambiar contraseña</a>
        </p>
      `,
    );
    return this.send(to, subject, text, html);
  }

  async sendPasswordReset(
    to: string,
    username: string,
    tempPassword: string,
    changePasswordUrl: string,
  ): Promise<boolean> {
    const subject = 'Recuperación de contraseña - Ferromaderas Admin';
    const text = `Hola ${username},\n\nSe ha generado una contraseña temporal para tu cuenta.\n\nContraseña temporal: ${tempPassword}\n\nDebes cambiarla antes de iniciar sesión. Haz clic en el enlace:\n${changePasswordUrl}\n\n— Ferromaderas`;
    const html = this.emailTemplate(
      `Hola <strong>${username}</strong>,`,
      `
        <p>Se ha generado una contraseña temporal para tu cuenta.</p>
        <p><strong>Contraseña temporal:</strong> <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;">${tempPassword}</code></p>
        <p>Debes cambiarla antes de poder iniciar sesión. Haz clic en el botón:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${changePasswordUrl}" style="background:#1e3a8a;color:white!important;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">Cambiar contraseña</a>
        </p>
        <p style="color:#64748b;font-size:14px;">Si no solicitaste este cambio, ignora este correo.</p>
      `,
    );
    return this.send(to, subject, text, html);
  }
}
