// Exports the OpenAPI document to packages/shared-types/openapi.json (source for the Dart codegen).
// Runs against the *compiled* app: tsx/esbuild drops `emitDecoratorMetadata`, which breaks Nest's
// type-based DI, so this script requires `pnpm build` first (the npm script chains them).
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const here = dirname(fileURLToPath(import.meta.url));
process.env.DATABASE_URL ??= 'postgresql://x:x@localhost:5432/x';
process.env.PII_ENC_KEY ??= Buffer.alloc(32, 7).toString('base64');

const { AppModule } = await import(resolve(here, '../dist/app.module.js'));
const app = await NestFactory.create(AppModule, { logger: ['error'] });
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Sinaaty API — صناعتي').setVersion('1').addBearerAuth().build());
const out = resolve(here, '../../../packages/shared-types/openapi.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
await app.close();
console.warn(`OpenAPI written to ${out} (${Object.keys(doc.paths).length} paths)`);
process.exit(0);
