import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './core/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
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
  } catch (err) {
    console.warn(
      'Database connection failed. API will run but DB features are unavailable.',
    );
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`\n🚀 Ferromaderas API running at http://localhost:${port}/api`);
  console.log(`   Health: http://localhost:${port}/api/health\n`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
