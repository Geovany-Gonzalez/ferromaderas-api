import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

const LOGO_CID = 'logo@ferromaderas';

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
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        tls: {
          // En desarrollo permite certificados no verificados (proxy, etc.)
          rejectUnauthorized: this.config.get<string>('NODE_ENV') === 'production',
        },
      });
      console.log('[MailService] SMTP configurado:', host, 'puerto', port ?? 587);
    } else {
      console.warn('[MailService] SMTP NO configurado. Variables requeridas: SMTP_HOST, SMTP_USER, SMTP_PASS');
    }
  }

  /** Indica si el envío de correos está disponible */
  isConfigured(): boolean {
    return this.transporter !== null;
  }

  private get from(): string {
    return this.config.get<string>('MAIL_FROM') ?? 'noreply@ferromaderas.com';
  }

  /** Ruta al logo (icono casa+herramientas). Se embute en el correo para que funcione sin URL externa. */
  private get logoPath(): string {
    const roots = [
      path.join(process.cwd(), 'assets', 'icons', 'logo.png'),
      path.join(__dirname, '..', '..', '..', 'assets', 'icons', 'logo.png'),
    ];
    for (const p of roots) {
      if (fs.existsSync(p)) return p;
    }
    return '';
  }

  /** Adjuntos para incrustar el logo en el correo (evita depender de URL externa). */
  private getLogoAttachments(): nodemailer.SendMailOptions['attachments'] {
    const p = this.logoPath;
    if (!p) return undefined;
    try {
      return [
        {
          filename: 'logo.png',
          content: fs.readFileSync(p),
          cid: LOGO_CID,
        },
      ];
    } catch {
      return undefined;
    }
  }

  private emailTemplate(title: string, body: string, useEmbeddedLogo: boolean): string {
    const logoHtml = useEmbeddedLogo
      ? `<img src="cid:${LOGO_CID}" alt="" style="height:52px;width:auto;display:inline-block;vertical-align:middle;margin-right:12px;" /><span style="color:white;font-size:24px;font-weight:700;vertical-align:middle;">Ferro</span><span style="color:#f59e0b;font-size:24px;font-weight:700;vertical-align:middle;">Maderas</span>`
      : `<span style="color:white;font-size:24px;font-weight:700;">Ferro</span><span style="color:#f59e0b;font-size:24px;font-weight:700;">Maderas</span>`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ferromaderas</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;font-size:18px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:#1e3a8a;padding:28px 24px;text-align:center;">
              ${logoHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:36px 28px;color:#334155;line-height:1.7;font-size:18px;">
              <div style="font-size:18px;">
              ${title}
              ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;background:#f8fafc;text-align:center;color:#64748b;font-size:14px;">
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

  async send(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: nodemailer.SendMailOptions['attachments'],
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('[MailService] SMTP no configurado. Email NO enviado:', { to, subject });
      return true; // No fallar en desarrollo
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html: html ?? text.replace(/\n/g, '<br>'),
        attachments,
      });
      return true;
    } catch (err) {
      console.error('[MailService] Error enviando email a', to, ':', err);
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
    const hasLogo = !!this.logoPath;
    const html = this.emailTemplate(
      '<p style="font-size:20px;margin:0 0 16px;">Hola,</p><p style="font-size:18px;margin:0 0 16px;">Tu usuario ha sido creado en el sistema <strong>Ferromaderas</strong>.</p>',
      `
        <p style="font-size:18px;margin:0 0 16px;"><strong>Usuario:</strong> <code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:18px;">${username}</code></p>
        <p style="font-size:18px;margin:0 0 16px;"><strong>Contraseña temporal:</strong> <code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:18px;">${password}</code></p>
        <p style="font-size:18px;margin:0 0 20px;">Debes cambiar tu contraseña antes de poder iniciar sesión. Haz clic en el botón:</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${changePasswordUrl}" style="background:#1e3a8a;color:white!important;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:18px;">Cambiar contraseña</a>
        </p>
      `,
      hasLogo,
    );
    return this.send(to, subject, text, html, this.getLogoAttachments());
  }

  async sendPasswordReset(
    to: string,
    username: string,
    tempPassword: string,
    changePasswordUrl: string,
  ): Promise<boolean> {
    const subject = 'Recuperación de contraseña - Ferromaderas Admin';
    const text = `Hola ${username},\n\nSe ha generado una contraseña temporal para tu cuenta.\n\nContraseña temporal: ${tempPassword}\n\nDebes cambiarla antes de iniciar sesión. Haz clic en el enlace:\n${changePasswordUrl}\n\nEste enlace es válido por 24 horas.\n\n— Ferromaderas`;
    const hasLogo = !!this.logoPath;
    const html = this.emailTemplate(
      `<p style="font-size:20px;margin:0 0 16px;">Hola <strong>${username}</strong>,</p>`,
      `
        <p style="font-size:18px;margin:0 0 16px;">Se ha generado una contraseña temporal para tu cuenta.</p>
        <p style="font-size:18px;margin:0 0 16px;"><strong>Contraseña temporal:</strong> <code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:18px;">${tempPassword}</code></p>
        <p style="font-size:18px;margin:0 0 20px;">Debes cambiarla antes de poder iniciar sesión. Haz clic en el botón:</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${changePasswordUrl}" style="background:#1e3a8a;color:white!important;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:18px;">Cambiar contraseña</a>
        </p>
        <p style="color:#64748b;font-size:16px;margin:16px 0 0;"><strong>Importante:</strong> Este enlace es válido por 24 horas. Si expira, solicita uno nuevo.</p>
        <p style="color:#64748b;font-size:16px;margin:24px 0 0;">Si no solicitaste este cambio, ignora este correo.</p>
      `,
      hasLogo,
    );
    return this.send(to, subject, text, html, this.getLogoAttachments());
  }
}
