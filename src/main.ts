import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './core/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:4200'],
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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 Ferromaderas API running at http://localhost:${port}/api`);
  console.log(`   Health: http://localhost:${port}/api/health\n`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
