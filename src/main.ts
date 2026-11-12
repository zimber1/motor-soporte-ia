import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: () =>
      new BadRequestException(
        'Solicitud inválida: revisa el mensaje, el modo y que no haya propiedades adicionales.',
      ),
  }));
  app.enableCors();
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un número entero entre 1 y 65535.');
  }
  await app.listen(port);
  console.log(`AI Support Engine disponible en http://localhost:${port}/api`);
}
void bootstrap();
