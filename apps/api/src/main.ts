import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(Number(process.env.API_PORT ?? 3001), '0.0.0.0');
}
bootstrap();
