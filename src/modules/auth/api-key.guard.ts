import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env.INVENTORY_SYNC_API_KEY;

    if (!expectedKey?.trim()) {
      throw new UnauthorizedException(
        'INVENTORY_SYNC_API_KEY no está configurado en el servidor.',
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('API Key inválida.');
    }

    return true;
  }
}
