import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaService } from './core/database/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(cookieParser());
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin:
      process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
      ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const prisma = app.get(PrismaService);
  try {
    await prisma.$connect();
  } catch {
    logger.warn(
      'No se pudo conectar a la base de datos; algunas funciones no estarán disponibles.',
    );
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`API Ferromaderas en ejecución (prefijo /api, puerto ${port})`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    `No se pudo iniciar la aplicación: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
