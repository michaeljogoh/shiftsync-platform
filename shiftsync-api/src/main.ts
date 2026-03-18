import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { swaggerConfig } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';

  app.enableCors({
    origin:"*"
  })

  // URI versioning: all routes under /api/v1/
  app.setGlobalPrefix('api/v1');

  // Global ValidationPipe: strip unknown props, transform types, reject non-whitelisted
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger UI at /api/docs in non-production
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    Logger.log(`Swagger UI at  baseurl/api/docs`);


  await app.listen(port);
  Logger.log(`ShiftSync API listening on http://localhost:${port}/api/v1`);
}

bootstrap();
