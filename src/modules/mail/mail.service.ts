import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

const LOGO_CID = 'logo@ferromaderas';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
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
      this.logger.log('SMTP transport inicializado');
    } else {
      this.logger.warn(
        'SMTP no configurado; no se enviarán correos hasta definir SMTP_HOST, SMTP_USER y SMTP_PASS',
      );
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
      this.logger.debug('Correo omitido: SMTP no configurado');
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
      this.logger.error(
        `Fallo al enviar correo: ${err instanceof Error ? err.message : 'error desconocido'}`,
      );
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
      this.logger.warn(
        'SMTP no configurado: credenciales no enviadas por correo (usa otro canal seguro para el usuario)',
      );
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

  /** Envía la cotización al cliente con el detalle de productos y el enlace de consulta. */
  async sendQuote(
    to: string,
    quote: {
      codigo: string;
      clienteNombre?: string;
      neto?: number;
      ivaPorcentaje?: number;
      ivaMonto?: number;
      totalConIva?: number;
      total: number;
      items: { codigo: string; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
    },
    publicUrl: string,
  ): Promise<boolean> {
    const subject = `Tu cotización ${quote.codigo} - Ferromaderas`;
    const saludo = quote.clienteNombre?.trim()
      ? `Hola ${quote.clienteNombre.trim()},`
      : 'Hola,';

    const fmtQ = (n: number) => `Q${n.toLocaleString('es-GT')}`;
    const filasTexto = quote.items
      .map((it) => `• ${it.codigo} - ${it.nombre}\n  ${it.cantidad} x ${fmtQ(it.precioUnitario)} = ${fmtQ(it.subtotal)}`)
      .join('\n');
    const totalPagar = quote.totalConIva ?? quote.total;
    const totalesTexto = `Total: ${fmtQ(totalPagar)}`;
    const text = `${saludo}\n\nGracias por tu interés en Ferromaderas. Aquí está tu cotización ${quote.codigo}:\n\n${filasTexto}\n\n${totalesTexto}\n\nPuedes consultarla en línea aquí:\n${publicUrl}\n\n— Ferromaderas`;

    const filasHtml = quote.items
      .map(
        (it) => `
          <tr>
            <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:15px;">
              <strong>${it.codigo}</strong><br><span style="color:#64748b;">${it.nombre}</span>
            </td>
            <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:15px;">${it.cantidad}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:15px;">${fmtQ(it.precioUnitario)}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:15px;">${fmtQ(it.subtotal)}</td>
          </tr>`,
      )
      .join('');

    const hasLogo = !!this.logoPath;
    const html = this.emailTemplate(
      `<p style="font-size:20px;margin:0 0 16px;">${saludo}</p>
       <p style="font-size:18px;margin:0 0 16px;">Gracias por tu interés en <strong>Ferromaderas</strong>. Esta es tu cotización <strong>${quote.codigo}</strong>:</p>`,
      `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 16px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 6px;text-align:left;font-size:14px;color:#334155;">Producto</th>
              <th style="padding:8px 6px;text-align:center;font-size:14px;color:#334155;">Cant.</th>
              <th style="padding:8px 6px;text-align:right;font-size:14px;color:#334155;">Precio</th>
              <th style="padding:8px 6px;text-align:right;font-size:14px;color:#334155;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filasHtml}</tbody>
        </table>
        <p style="font-size:20px;margin:12px 0 20px;text-align:right;"><strong>Total: ${fmtQ(totalPagar)}</strong></p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${publicUrl}" style="background:#1e3a8a;color:white!important;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:18px;">Ver cotización en línea</a>
        </p>
        <p style="color:#64748b;font-size:15px;margin:16px 0 0;">Los precios pueden variar según disponibilidad. Un asesor te contactará para finalizar tu pedido.</p>
      `,
      hasLogo,
    );
    return this.send(to, subject, text, html, this.getLogoAttachments());
  }

  /**
   * Alerta interna de seguimiento comercial para el equipo de Ferromaderas.
   * Se envía al correo de la organización (SMTP_USER / QUOTES_NOTIFY_EMAIL).
   */
  async sendFollowUpAlert(
    to: string,
    alert: {
      tipo: 'nueva_cotizacion' | 'descuento_pendiente';
      codigo: string;
      clienteNombre?: string;
      clienteTelefono?: string;
      clienteEmail?: string;
      total: number;
      itemsCount?: number;
      descuentoPorcentaje?: number;
      descuentoMotivo?: string;
      mensajeAccion: string;
    },
    adminUrl: string,
  ): Promise<boolean> {
    const fmtQ = (n: number) => `Q${n.toLocaleString('es-GT')}`;
    const esNueva = alert.tipo === 'nueva_cotizacion';
    const subject = esNueva
      ? `[Seguimiento] Nueva cotización ${alert.codigo}`
      : `[Seguimiento] Descuento pendiente — ${alert.codigo}`;

    const titulo = esNueva
      ? 'Nueva cotización para dar seguimiento'
      : 'Descuento pendiente de aprobación';

    const cliente = alert.clienteNombre?.trim() || 'Sin nombre';
    const telefono = alert.clienteTelefono?.trim() || '—';
    const email = alert.clienteEmail?.trim() || '—';

    const lineasTexto = [
      titulo,
      '',
      `Cotización: ${alert.codigo}`,
      `Cliente: ${cliente}`,
      `Teléfono: ${telefono}`,
      `Correo: ${email}`,
      `Total: ${fmtQ(alert.total)}`,
    ];
    if (esNueva && alert.itemsCount != null) {
      lineasTexto.push(`Productos: ${alert.itemsCount}`);
    }
    if (!esNueva && alert.descuentoPorcentaje != null) {
      lineasTexto.push(`Descuento solicitado: ${alert.descuentoPorcentaje}%`);
      if (alert.descuentoMotivo) lineasTexto.push(`Motivo: ${alert.descuentoMotivo}`);
    }
    lineasTexto.push('', alert.mensajeAccion, '', `Abrir panel: ${adminUrl}`);
    const text = lineasTexto.join('\n');

    const detalleExtra = esNueva
      ? `<p style="font-size:17px;margin:0 0 12px;"><strong>Productos:</strong> ${alert.itemsCount ?? '—'}</p>`
      : `<p style="font-size:17px;margin:0 0 8px;"><strong>Descuento solicitado:</strong> ${alert.descuentoPorcentaje}%</p>
         ${alert.descuentoMotivo ? `<p style="font-size:16px;margin:0 0 12px;color:#64748b;"><strong>Motivo:</strong> ${alert.descuentoMotivo}</p>` : ''}`;

    const hasLogo = !!this.logoPath;
    const html = this.emailTemplate(
      `<p style="font-size:20px;margin:0 0 12px;font-weight:600;color:#1e3a8a;">${titulo}</p>
       <p style="font-size:17px;margin:0 0 16px;">Cotización <strong>${alert.codigo}</strong></p>`,
      `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:16px;">
          <tr><td style="padding:6px 0;color:#64748b;width:120px;">Cliente</td><td style="padding:6px 0;"><strong>${cliente}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Teléfono</td><td style="padding:6px 0;">${telefono}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Correo</td><td style="padding:6px 0;">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Total</td><td style="padding:6px 0;"><strong>${fmtQ(alert.total)}</strong></td></tr>
        </table>
        ${detalleExtra}
        <p style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 14px;border-radius:6px;font-size:16px;margin:16px 0;">
          ${alert.mensajeAccion}
        </p>
        <p style="text-align:center;margin:24px 0 8px;">
          <a href="${adminUrl}" style="background:#1e3a8a;color:white!important;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:17px;">Ver en el panel administrativo</a>
        </p>
      `,
      hasLogo,
    );
    return this.send(to, subject, text, html, this.getLogoAttachments());
  }

  async sendPasswordReset(
    to: string,
    displayName: string,
    tempPassword: string,
    changePasswordUrl: string,
    forClient = false,
  ): Promise<boolean> {
    const subject = forClient
      ? 'Recuperación de contraseña - Ferromaderas'
      : 'Recuperación de contraseña - Ferromaderas Admin';
    const intro = forClient
      ? 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de cliente.'
      : 'Se ha generado una contraseña temporal para tu cuenta.';
    const text = `Hola ${displayName},\n\n${intro}\n\nContraseña temporal: ${tempPassword}\n\nDebes cambiarla antes de iniciar sesión. Haz clic en el enlace:\n${changePasswordUrl}\n\nEste enlace es válido por 24 horas.\n\n— Ferromaderas`;
    const hasLogo = !!this.logoPath;
    const html = this.emailTemplate(
      `<p style="font-size:20px;margin:0 0 16px;">Hola <strong>${displayName}</strong>,</p>`,
      `
        <p style="font-size:18px;margin:0 0 16px;">${intro}</p>
        <p style="font-size:18px;margin:0 0 16px;"><strong>Contraseña temporal:</strong> <code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:18px;">${tempPassword}</code></p>
        <p style="font-size:18px;margin:0 0 20px;">Debes cambiarla antes de poder iniciar sesión. Haz clic en el botón:</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${changePasswordUrl}" style="background:#1e3a8a;color:white!important;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:18px;">Cambiar contraseña</a>
        </p>
        <p style="color:#64748b;font-size:16px;margin:16px 0 0;"><strong>Importante:</strong> Este enlace es válido por 24 horas. Si expira, solicita uno nuevo desde Mis cotizaciones.</p>
        <p style="color:#64748b;font-size:16px;margin:24px 0 0;">Si no solicitaste este cambio, ignora este correo.</p>
      `,
      hasLogo,
    );
    return this.send(to, subject, text, html, this.getLogoAttachments());
  }
}
