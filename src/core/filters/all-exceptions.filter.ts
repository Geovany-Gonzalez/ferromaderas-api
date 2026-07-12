import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BitacoraService } from '../../modules/bitacora/bitacora.service';

/**
 * Filtro global de excepciones.
 *
 * Centraliza el registro técnico de errores del backend (Cap. III, 3.7.6):
 * - Las excepciones controladas (HttpException, 4xx) se registran como advertencia.
 * - Los errores no controlados (5xx) se registran con su traza para diagnóstico,
 *   pero al cliente solo se le devuelve un mensaje genérico para no exponer
 *   detalles internos del sistema.
 *
 * Además, los errores del servidor (5xx) se persisten en la bitácora (módulo
 * `errores`) para que el administrador pueda consultarlos desde el panel.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly bitacora: BitacoraService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const clientMessage = isHttp
      ? this.extractMessage(exception)
      : 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

    const logContext = `${request.method} ${request.originalUrl}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      const detail =
        exception instanceof Error ? exception.message : String(exception);
      this.logger.error(`${logContext} -> ${status} | ${detail}`, stack);
      this.persistirError(request, status, detail, stack);
    } else {
      this.logger.warn(`${logContext} -> ${status} | ${clientMessage}`);
    }

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  /** Guarda el error del servidor en la bitácora (sin bloquear la respuesta). */
  private persistirError(
    request: Request,
    status: number,
    detail: string,
    stack?: string,
  ): void {
    const user = (request as Request & { user?: { sub?: string } }).user;
    void this.bitacora.registrar({
      modulo: 'errores',
      accion: `${request.method} ${status}`,
      usuarioId: user?.sub,
      ip: request.ip ?? request.socket?.remoteAddress,
      detalles: {
        ruta: request.originalUrl,
        metodo: request.method,
        status,
        mensaje: detail?.slice(0, 500),
        // Traza recortada: suficiente para diagnóstico sin inflar la BD.
        traza: stack?.split('\n').slice(0, 6).join('\n').slice(0, 2000),
      },
    });
  }

  private extractMessage(exception: HttpException): string {
    const res = exception.getResponse();
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'message' in res) {
      const msg = (res as { message: unknown }).message;
      return Array.isArray(msg) ? msg.join(', ') : String(msg);
    }
    return exception.message;
  }
}
