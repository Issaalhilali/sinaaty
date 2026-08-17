import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  const config = app.get(AppConfig);

  app.useLogger(logger);
  app.use(helmet());
  app.set('trust proxy', 1);
  app.enableCors({ origin: config.get('CORS_ORIGINS'), credentials: true });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();

  if (!config.isProd) {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Sinaaty API — صناعتي')
        .setDescription('Core API for the Sinaaty platform. Errors use {code, message_ar, message_en, details, request_id}.')
        .setVersion('1')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, doc, { jsonDocumentUrl: 'docs/openapi.json' });
  }

  const port = config.get('PORT');
  await app.listen(port);
  logger.log(`API listening on ${config.get('API_BASE_URL')} (env=${config.get('APP_ENV')}) — docs at /docs`);
}

void bootstrap();
