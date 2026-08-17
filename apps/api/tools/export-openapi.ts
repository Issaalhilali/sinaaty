// Exports the OpenAPI document to packages/shared-types/openapi.json (source for Dart codegen).
import 'reflect-metadata';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  process.env['DATABASE_URL'] ??= 'postgresql://x:x@localhost:5432/x';
  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Sinaaty API — صناعتي').setVersion('1').addBearerAuth().build(),
  );
  const out = resolve(__dirname, '../../../packages/shared-types/openapi.json');
  mkdirSync(resolve(out, '..'), { recursive: true });
  writeFileSync(out, JSON.stringify(doc, null, 2));
  await app.close();
  console.warn(`OpenAPI written to ${out}`);
}
void main();
