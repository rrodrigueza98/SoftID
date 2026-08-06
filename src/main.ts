import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // FRONTEND_URL restringe el CORS al dominio del frontend desplegado
  // (ej. https://softid.vercel.app). Sin configurar, acepta cualquier
  // origen -- util mientras se arma el despliegue.
  app.enableCors({ origin: process.env.FRONTEND_URL || true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SoftID API escuchando en http://localhost:${port}/api`);
}
bootstrap();
