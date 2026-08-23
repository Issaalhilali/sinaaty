import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

/** Step 7 verify: full happy path, illegal transitions rejected, snapshot immutability, realtime channel. */
describe('Work orders (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let baseUrl: string;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001'; // seeded owner of ورشة النور (active)
  const customerPhone = `+96651${suffix}`;
  let wsTok: string; let custTok: string; let orgId: string; let woId: string; let itemId: string; let sha1: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    const addr = app.getHttpServer().address() as { port: number }; baseUrl = `http://127.0.0.1:${addr.port}`;
    prisma = app.get(PrismaService);
    wsTok = await login(workshopPhone); custTok = await login(customerPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
  });
  afterAll(async () => { await app.close(); });

  it('workshop creates a work order with customer phone + VIN + items → draft, WO number, totals', async () => {
    const res = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: customerPhone, vin: `4T1B11HK5KU${suffix.slice(0, 6)}`, plate: 'أ ب ج 4821', title_ar: 'سمكرة رفرف + دسكات', payment_terms: 'deferred', due_date: '2026-09-30', items: [
      { type: 'labor', description_ar: 'سمكرة ودهان رفرف أمامي أيمن', quantity: 1, unit_price: '650' },
      { type: 'part', description_ar: 'دسكات أمامية — أصلي', part_condition: 'oem_new', quantity: 1, unit_price: '420', warranty_days: 365 },
      { type: 'labor', description_ar: 'أجور فك وتركيب', quantity: 1, unit_price: '120' },
    ] }).expect(201);
    woId = res.body.id; expect(res.body.number).toMatch(/^WO-\d{4}-\d{6}$/); expect(res.body.status).toBe('draft');
    expect(res.body.subtotal).toBe('1190.00'); expect(res.body.vatAmount).toBe('178.50'); expect(res.body.total).toBe('1368.50');
    itemId = res.body.items[1].id;
  });
  it('an order created without a title still says what it is — never a row that names itself by its number', async () => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: customerPhone, plate: 'ع ن و 4242', items: [
      { type: 'labor', description_ar: 'تغيير زيت وفلتر', quantity: 1, unit_price: '200' },
      { type: 'part', description_ar: 'فلتر هواء', quantity: 1, unit_price: '60' },
    ] }).expect(201);
    expect(wo.body.titleAr).toBe('تغيير زيت وفلتر +1');
    expect(wo.body.vehiclePlateAr).toBe('ع ن و 4242');   // والسيارة تسافر مع الأمر في القائمة والتفصيل
  });

  it('customer sees it in their list; a stranger cannot read it', async () => {
    const mine = await http().get('/v1/work-orders').set(auth(custTok)).expect(200);
    expect(mine.body.map((w: { id: string }) => w.id)).toContain(woId);
    const stranger = await login(`+96650${suffix}`);
    await http().get(`/v1/work-orders/${woId}`).set(auth(stranger)).expect(403);
  });
  it('illegal transition rejected (draft → in_progress) and execution before approval blocked', async () => {
    const r = await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'in_progress' }).expect(409);
    expect(r.body.code).toBe('CONFLICT');
  });
  it('check-in inspection with photos → received → inspecting, passport event, damages recorded', async () => {
    const p = await http().post('/v1/media/presign').set(auth(wsTok)).send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 1000, sha256: 'b'.repeat(64), purpose: 'inspection' }).expect(200);
    const ins = await http().post(`/v1/work-orders/${woId}/inspections`).set(auth(wsTok)).send({ type: 'check_in', odometer_km: 84250, fuel_level_pct: 40, checklist: { angles: 8 }, damages: [{ zone: 'front_right_fender', severity: 'moderate', note_ar: 'خدش عميق' }], media_ids: [p.body.media_id] }).expect(201);
    expect(ins.body.work_order.status).toBe('inspecting');
    const tl = await http().get(`/v1/work-orders/${woId}/timeline`).set(auth(custTok)).expect(200);
    expect(tl.body.inspections[0].mediaIds).toHaveLength(1); expect(tl.body.history.map((h: { to: string }) => h.to)).toEqual(['draft', 'received', 'inspecting']);
  });
  it('request approval → version 1 snapshot with sha256, status awaiting_approval; item edits now need a change order', async () => {
    const r = await http().post(`/v1/work-orders/${woId}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    expect(r.body.work_order.status).toBe('awaiting_approval'); expect(r.body.version).toBe(1); sha1 = r.body.snapshot_sha256; expect(sha1).toMatch(/^[0-9a-f]{64}$/);
    const v = await http().get(`/v1/work-orders/${woId}/versions/1`).set(auth(custTok)).expect(200);
    expect(v.body.snapshot.totals.total).toBe('1368.50'); expect(v.body.signed).toBe(false);
  });
  it('snapshot immutability: DB trigger rejects UPDATE/DELETE on work_order_versions', async () => {
    await expect(prisma.$executeRaw`UPDATE work_order_versions SET snapshot_sha256 = 'x' WHERE work_order_id = ${woId}::uuid`).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRaw`DELETE FROM work_order_versions WHERE work_order_id = ${woId}::uuid`).rejects.toThrow(/append-only/);
  });
  it('workshop cannot approve; customer approves with OTP → signature stores the snapshot hash → awaiting_parts (has a part)', async () => {
    await http().post(`/v1/work-orders/${woId}/approve`).set(auth(wsTok)).send({ method: 'otp' }).expect(403);
    const init = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    expect(init.body.snapshot_sha256).toBe(sha1);
    await http().post(`/v1/work-orders/${woId}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: '000000' }).expect(400);
    const done = await http().post(`/v1/work-orders/${woId}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    expect(done.body.approved).toBe(true); expect(done.body.snapshot_sha256).toBe(sha1); expect(done.body.work_order.status).toBe('awaiting_parts');
    const sig = await prisma.$queryRaw<Array<{ signed_hash: string; method: string }>>`SELECT signed_hash, method FROM work_order_signatures WHERE work_order_id = ${woId}::uuid`;
    expect(sig[0]).toEqual({ signed_hash: sha1, method: 'otp' });
    // direct item price edit is now blocked
    await http().patch(`/v1/work-orders/${woId}/items/${itemId}`).set(auth(wsTok)).send({ unit_price: '999' }).expect(409);
  });
  it('realtime: customer subscribed to work-order:{id} receives status events; stranger is refused', async () => {
    const connect = (token: string) => new Promise<Socket>((res, rej) => { const s = io(`${baseUrl}/realtime`, { auth: { token }, transports: ['websocket'] }); s.on('connect', () => res(s)); s.on('connect_error', rej); });
    const sock = await connect(custTok);
    const sub = await new Promise<{ ok: boolean }>((res) => sock.emit('subscribe', { channel: `work-order:${woId}` }, res));
    expect(sub.ok).toBe(true);
    const evt = new Promise<{ to: string }>((res) => sock.once('status', res));
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'in_progress', note_ar: 'وصلت القطع' }).expect(200);
    expect((await evt).to).toBe('in_progress');
    const strangerSock = await connect(await login(`+96650${suffix}`));
    const refused = await new Promise<{ ok: boolean; code?: string }>((res) => strangerSock.emit('subscribe', { channel: `work-order:${woId}` }, res));
    expect(refused).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    sock.close(); strangerSock.close();
  });
  it('change order during execution → version 2 → awaiting_approval → customer approves v2 (v1 approval no longer valid)', async () => {
    const co = await http().post(`/v1/work-orders/${woId}/change-orders`).set(auth(wsTok)).send({ reason_ar: 'اكتُشف تلف في المساعد الأمامي', add: [{ type: 'part', description_ar: 'مساعد أمامي يمين', quantity: 1, unit_price: '380' }] }).expect(200);
    expect(co.body.version).toBe(2); expect(co.body.work_order.status).toBe('awaiting_approval'); expect(co.body.work_order.total).toBe('1805.50'); expect(co.body.snapshot_sha256).not.toBe(sha1);
    const stale = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(custTok)).send({ method: 'otp', version: 1 }).expect(409);
    expect(stale.body.code).toBe('CONFLICT');
    const init = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    const done = await http().post(`/v1/work-orders/${woId}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    expect(done.body.version).toBe(2);
    const versions = await http().get(`/v1/work-orders/${woId}/timeline`).set(auth(custTok)).expect(200);
    expect(versions.body.versions.map((v: { version: number; signed: boolean }) => [v.version, v.signed])).toEqual([[1, true], [2, true]]);
  });
  it('progress photos, quality check, ready; delivered requires check-out; customer closes; document renders in Arabic', async () => {
    const p = await http().post('/v1/media/presign').set(auth(wsTok)).send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 1000, sha256: 'c'.repeat(64), purpose: 'work_order' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/media`).set(auth(wsTok)).send({ media_ids: [p.body.media_id], label: 'after', item_id: itemId }).expect(200);
    await http().patch(`/v1/work-orders/${woId}/items/${itemId}`).set(auth(wsTok)).send({ is_completed: true }).expect(200);
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'in_progress' }).expect(200); // v2 had a part → awaiting_parts
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'quality_check' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'ready' }).expect(200);
    const noCheckout = await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'delivered' }).expect(409);
    expect(noCheckout.body.message_ar).toContain('فحص التسليم');
    await http().post(`/v1/work-orders/${woId}/inspections`).set(auth(wsTok)).send({ type: 'check_out', odometer_km: 84260, media_ids: [] }).expect(201);
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'delivered' }).expect(200);
    const closed = await http().post(`/v1/work-orders/${woId}/transition`).set(auth(custTok)).send({ to: 'closed' }).expect(200);
    expect(closed.body.status).toBe('closed');
    const doc = await http().get(`/v1/work-orders/${woId}/versions/2/document`).set(auth(custTok)).expect(200);
    expect(doc.headers['content-type']).toContain('text/html'); expect(doc.text).toContain('dir="rtl"'); expect(doc.text).toContain('معتمد بتوقيع العميل'); expect(doc.text).toContain('1,805.50');
    // closed → no further edits
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'in_progress' }).expect(409);
    // passport shows the work order + inspections
    const passport = await http().get(`/v1/vehicles/${(await http().get(`/v1/work-orders/${woId}`).set(auth(custTok))).body.vehicleId}/passport`).set(auth(custTok)).expect(200);
    expect(passport.body.events.map((e: { type: string }) => e.type)).toEqual(expect.arrayContaining(['inspection', 'work_order']));
  });
  it('customer may cancel only before approval', async () => {
    const wo2 = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: customerPhone, plate: 'د هـ و 1190', items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '50' }] }).expect(201);
    await http().post(`/v1/work-orders/${wo2.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    const c = await http().post(`/v1/work-orders/${wo2.body.id}/cancel`).set(auth(custTok)).send({ reason_ar: 'غيّرت رأيي' }).expect(200);
    expect(c.body.status).toBe('cancelled');
    await http().post(`/v1/work-orders/${woId}/cancel`).set(auth(custTok)).send({ reason_ar: 'x' }).expect(400); // reason too short → validation
    await http().post(`/v1/work-orders/${woId}/cancel`).set(auth(custTok)).send({ reason_ar: 'أريد الإلغاء' }).expect(403); // approved → customer cannot
  });
});
