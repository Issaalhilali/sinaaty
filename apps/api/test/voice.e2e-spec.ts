import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

/**
 * Step 27 verify: the advisor dictates, the platform proposes, **a person reviews**, and only the
 * reviewed lines — with the reviewer's prices — reach the work order the customer will sign.
 */
describe('Voice to invoice (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';
  const customerPhone = `+96659${suffix}`;
  let wsTok: string; let orgId: string; let woId: string; let mediaId: string; let noteId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const presignAudio = async () => (await http().post('/v1/media/presign').set(auth(wsTok))
    .send({ kind: 'audio', mime_type: 'audio/mp4', size_bytes: 240_000, sha256: 'c'.repeat(64), purpose: 'work_order' }).expect(200)).body.media_id as string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    wsTok = await login(workshopPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      org_id: orgId, customer_phone: customerPhone, vin: `WVWZZZ1JZ3W${suffix.slice(0, 6)}`, title_ar: 'صيانة دورية', payment_terms: 'on_delivery',
      items: [{ type: 'labor', description_ar: 'فحص أولي', quantity: 1, unit_price: '100' }],
    }).expect(201);
    woId = wo.body.id;
    mediaId = await presignAudio();
  });
  afterAll(async () => { await app.close(); });

  it('a dictation becomes a transcript and proposed lines — nothing is added to the order yet', async () => {
    const r = await http().post(`/v1/work-orders/${woId}/voice-notes`).set(auth(wsTok))
      .send({ media_id: mediaId, hint_ar: 'تغيير زيت وفلتر بمئتين وستين، وبعدين سمكرة رفرف أمامي بستمئة' }).expect(201);
    noteId = r.body.id;
    expect(r.body.status).toBe('transcribed');
    expect(r.body.transcript_ar).toContain('تغيير زيت');
    expect(r.body.items).toHaveLength(2);
    expect(r.body.items[0]).toMatchObject({ type: 'labor', unit_price: '260.00' });
    expect(r.body.items[1]).toMatchObject({ type: 'paint', unit_price: '600.00' });
    // Every proposed line shows what was heard, so the reviewer checks the words, not only the numbers.
    expect(r.body.items[0].heard_ar).toContain('مئتين');
    expect(r.body.ready).toBe(true);

    // The work order is untouched until a person applies the lines.
    const wo = await http().get(`/v1/work-orders/${woId}`).set(auth(wsTok)).expect(200);
    expect(wo.body.items).toHaveLength(1);
    expect(wo.body.total).toBe('115.00');
  });

  it('a line the advisor never priced comes back flagged, not invented', async () => {
    const media = await presignAudio();
    const r = await http().post(`/v1/work-orders/${woId}/voice-notes`).set(auth(wsTok))
      .send({ media_id: media, hint_ar: 'تركيب دسكات أمامية' }).expect(201);
    expect(r.body.items[0].unit_price).toBeNull();
    expect(r.body.items[0].needs_price).toBe(true);
    expect(r.body.missing_prices).toBe(1);
    expect(r.body.ready).toBe(false);
    await http().post(`/v1/voice-notes/${r.body.id}/discard`).set(auth(wsTok)).send({ reason_ar: 'سأضيفها يدوياً' }).expect(200);
    expect((await http().get(`/v1/voice-notes/${r.body.id}`).set(auth(wsTok)).expect(200)).body.status).toBe('discarded');
  });

  it('applying uses the reviewer’s edits — the model’s numbers do not reach the customer', async () => {
    const r = await http().post(`/v1/voice-notes/${noteId}/apply`).set(auth(wsTok)).send({
      items: [
        // The reviewer corrected the price and the wording before confirming.
        { type: 'labor', description_ar: 'تغيير زيت وفلتر (شل 5W-30)', quantity: 1, unit_price: '280.00' },
        { type: 'paint', description_ar: 'سمكرة ودهان رفرف أمامي أيمن', quantity: 1, unit_price: '600.00', warranty_days: 180 },
      ],
    }).expect(200);
    expect(r.body.applied).toBe(2);

    const wo = await http().get(`/v1/work-orders/${woId}`).set(auth(wsTok)).expect(200);
    expect(wo.body.items).toHaveLength(3);
    expect(wo.body.items.map((i: { descriptionAr: string }) => i.descriptionAr)).toContain('تغيير زيت وفلتر (شل 5W-30)');
    // 100 + 280 + 600 = 980 + 15% VAT
    expect(wo.body.subtotal).toBe('980.00');
    expect(wo.body.total).toBe('1127.00');

    const audit = await prisma.auditLog.findMany({ where: { entityId: noteId }, orderBy: { id: 'asc' } });
    expect(audit.map((a) => a.action)).toEqual(['voice_note.transcribed', 'voice_note.applied']);
  });

  it('a note cannot be applied twice, and a stranger cannot read or apply it', async () => {
    await http().post(`/v1/voice-notes/${noteId}/apply`).set(auth(wsTok)).send({ items: [{ type: 'labor', description_ar: 'مرة أخرى', quantity: 1, unit_price: '50.00' }] }).expect(409);
    const stranger = await login(`+96657${suffix}`);
    await http().get(`/v1/voice-notes/${noteId}`).set(auth(stranger)).expect(403);
    await http().post(`/v1/work-orders/${woId}/voice-notes`).set(auth(stranger)).send({ media_id: mediaId }).expect(403);
  });

  it('a file that is not audio is refused before any provider is called', async () => {
    const image = (await http().post('/v1/media/presign').set(auth(wsTok))
      .send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 1000, sha256: 'd'.repeat(64), purpose: 'work_order' }).expect(200)).body.media_id as string;
    const r = await http().post(`/v1/work-orders/${woId}/voice-notes`).set(auth(wsTok)).send({ media_id: image }).expect(400);
    expect(r.body.message_ar).toContain('ليس تسجيلاً صوتياً');
  });

  it('the work order lists its dictations, newest first', async () => {
    const list = await http().get(`/v1/work-orders/${woId}/voice-notes`).set(auth(wsTok)).expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(2);
    expect(list.body[0].created_at >= list.body[1].created_at).toBe(true);
    expect(list.body.some((n: { status: string }) => n.status === 'applied')).toBe(true);
  });
});
