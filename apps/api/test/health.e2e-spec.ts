import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health → 200 with service report and request id', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.body.service).toBe('api');
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toMatch(/[\w-]{8,}/);
  });

  it('echoes an incoming x-request-id', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').set('x-request-id', 'test-req-123').expect(200);
    expect(res.headers['x-request-id']).toBe('test-req-123');
  });

  it('GET /v1/health/ready → reports postgres up|down without crashing', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health/ready').expect(200);
    expect(['up', 'down']).toContain(res.body.dependencies.postgres);
  });

  it('unknown route → bilingual NOT_FOUND envelope', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', message_ar: expect.any(String), message_en: expect.any(String) });
    expect(res.body.request_id).toBeDefined();
  });
});
