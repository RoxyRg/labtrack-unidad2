import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  app.enableCors({
    origin: [
      'http://localhost:4202',
      'http://127.0.0.1:4202',
    ],
  });

  app.enableShutdownHooks();

  const puerto = Number(process.env.PORT || 3002);
  const host = process.env.HOST || '127.0.0.1';

  await app.listen(puerto, host);

  console.log(`LabTrack API: http://${host}:${puerto}`);
}

bootstrap();
