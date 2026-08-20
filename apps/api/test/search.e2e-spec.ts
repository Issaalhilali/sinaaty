import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';
import { SearchSyncService } from '../src/modules/search/application/search-sync.service';

/**
 * Step 30 verify: a customer types Arabic the way people type it — misspelt — and still finds the
 * workshop; and a suspended workshop disappears from discovery the moment it is suspended.
 */
describe('Discovery search (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const adminPhone = '+966500000099';
  let adminTok: string; let orgId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init();
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    adminTok = await login(adminPhone);

    // A distinctly-named workshop, activated, indexed by the boot-equivalent resync.
    const owner = await login(`+96654${suffix}`);
    const org = await http().post('/v1/organizations').set(auth(owner))
      .send({ type: 'workshop', legal_name_ar: `ورشة الماسة الذهبية ${suffix}`, trade_name_ar: 'الماسة الذهبية', cr_number: `3${suffix}11` }).expect(201);
    orgId = org.body.id;
    await prisma.organization.update({ where: { id: orgId }, data: { status: 'active', verifiedAt: new Date() } });
    await app.get(SearchSyncService).reindexAll();
  });
  afterAll(async () => { await app.close(); });

  it('the misspelt name finds the workshop — «الماسه الذهبيه» with two ta-marbuta slips', async () => {
    const r = await http().get('/v1/organizations?q=' + encodeURIComponent('الماسه الذهبيه')).expect(200);
    expect(r.body.map((o: { id: string }) => o.id)).toContain(orgId);
    // And the properly spelt query still works, ranked first among matches.
    const exact = await http().get('/v1/organizations?q=' + encodeURIComponent('الماسة الذهبية')).expect(200);
    expect(exact.body[0]?.id).toBe(orgId);
  });

  it('type filtering still applies on top of text search', async () => {
    const r = await http().get('/v1/organizations?type=scrapyard&q=' + encodeURIComponent('الماسة')).expect(200);
    expect(r.body.map((o: { id: string }) => o.id)).not.toContain(orgId);
  });

  it('a suspended workshop disappears from discovery in the same breath', async () => {
    await http().post(`/v1/admin/organizations/${orgId}/suspend`).set(auth(adminTok))
      .send({ reason: 'مخالفة تجريبية لاختبار البحث' }).expect(200);
    await outbox.drain(100);
    const r = await http().get('/v1/organizations?q=' + encodeURIComponent('الماسة الذهبية')).expect(200);
    expect(r.body.map((o: { id: string }) => o.id)).not.toContain(orgId);
  });

  it('discovery without text (geo/type browsing) is untouched by the search layer', async () => {
    const r = await http().get('/v1/organizations?type=workshop&limit=5').expect(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeGreaterThan(0);
  });
});
