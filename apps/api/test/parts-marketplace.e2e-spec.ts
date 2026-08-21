import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/** Step 18 verify: reverse auction with 3 mock suppliers (scrapyard, dealer, distributor) → accept → order → pay → confirm → escrow released + warranty. */
describe('Parts marketplace — reverse auction (e2e)', () => {
  let app: INestApplication; const http = () => request(app.getHttpServer()); let outbox: OutboxProcessor;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const suffix = String(Date.now()).slice(-7);
  let wsTok: string; let scrapTok: string; let dealerTok: string; let distTok: string; let wsOrg: string; let scrapOrg: string; let dealerOrg: string; let distOrg: string; let reqId: string; let bids: Record<string, string> = {}; let orderId: string; let invoiceId: string;
  const orgOf = async (tok: string) => { const me = await http().get('/v1/me').set(auth(tok)).expect(200); for (const o of me.body.orgs as Array<{ org_id: string }>) { const org = await http().get(`/v1/organizations/${o.org_id}`).set(auth(tok)); if (org.status === 200 && org.body.status === 'active' && /^10100000/.test(org.body.crNumber ?? '')) return o.org_id; } return me.body.orgs[0].org_id as string; };
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1'); outbox = app.get(OutboxProcessor);
    wsTok = await login('+966500000001'); scrapTok = await login('+966500000002'); distTok = await login('+966500000003'); dealerTok = await login('+966500000004');
    wsOrg = await orgOf(wsTok); scrapOrg = await orgOf(scrapTok); distOrg = await orgOf(distTok); dealerOrg = await orgOf(dealerTok);
  });
  afterAll(async () => { await app.close(); });

  it('workshop opens a request by VIN → matched to nearby suppliers (PostGIS), notified via outbox', async () => {
    const r = await http().post('/v1/parts/requests').set(auth(wsTok)).send({ org_id: wsOrg, vin: `4T1B11HK5KU${suffix.slice(0, 6)}`, category_code: 'brake_discs', part_name_ar: 'دسكات أمامية كامري 2019', quantity: 1, lat: 24.63, lng: 46.79, radius_km: 50, bidding_minutes: 30 }).expect(201);
    reqId = r.body.id; expect(r.body.number).toMatch(/^PR-\d{4}-\d{6}$/); expect(r.body.status).toBe('open'); expect(r.body.recipients).toBeGreaterThanOrEqual(3);
    const rec = (await http().get(`/v1/parts/requests/${reqId}`).set(auth(wsTok)).expect(200)).body.recipients as Array<{ orgId: string; distanceKm: number | null }>;
    for (const o of [scrapOrg, dealerOrg, distOrg]) expect(rec.map((x) => x.orgId)).toContain(o);
    expect(rec.find((x) => x.orgId === scrapOrg)!.distanceKm).toBeGreaterThan(0);
    // supplier sees it in their inbox view; a random customer cannot read it
    const sup = await http().get(`/v1/parts/requests?org_id=${scrapOrg}&as=supplier`).set(auth(scrapTok)).expect(200); expect(sup.body.map((x: { id: string }) => x.id)).toContain(reqId);
    const stranger = await login(`+96657${suffix}`); await http().get(`/v1/parts/requests/${reqId}`).set(auth(stranger)).expect(403);
  });
  it('3 suppliers bid; a re-bid updates in place (one live bid per supplier); wrong condition rejected', async () => {
    const b1 = await http().post(`/v1/parts/requests/${reqId}/bids`).set(auth(scrapTok)).send({ org_id: scrapOrg, condition: 'used_scrapyard', unit_price: '150', warranty_days: 30, delivery_eta_hours: 4, donor_vin: `4T1B11HK5KU${suffix.slice(0, 6)}` }).expect(200);
    const b2 = await http().post(`/v1/parts/requests/${reqId}/bids`).set(auth(dealerTok)).send({ org_id: dealerOrg, condition: 'aftermarket_new', unit_price: '265', warranty_days: 365, delivery_eta_hours: 24 }).expect(200);
    const b3 = await http().post(`/v1/parts/requests/${reqId}/bids`).set(auth(distTok)).send({ org_id: distOrg, condition: 'oem_new', unit_price: '440', warranty_days: 365, delivery_eta_hours: 6 }).expect(200);
    bids = { scrap: b1.body.id, dealer: b2.body.id, dist: b3.body.id };
    const b3b = await http().post(`/v1/parts/requests/${reqId}/bids`).set(auth(distTok)).send({ org_id: distOrg, condition: 'oem_new', unit_price: '420', warranty_days: 365, delivery_eta_hours: 6 }).expect(200);
    expect(b3b.body.id).toBe(b3.body.id); expect(b3b.body.unitPrice).toBe('420.00');
    await http().post(`/v1/parts/requests/${reqId}/bids`).set(auth(scrapTok)).send({ org_id: scrapOrg, condition: 'refurbished', unit_price: '100' }).expect(400);
    const v = await http().get(`/v1/parts/requests/${reqId}`).set(auth(wsTok)).expect(200);
    expect(v.body.status).toBe('bidding'); expect(v.body.bids).toHaveLength(3); expect(v.body.lowest_bid).toBe('150.00'); expect(v.body.bids[0].unitPrice).toBe('150.00');
    // a supplier sees only its own bid
    const own = await http().get(`/v1/parts/requests/${reqId}`).set(auth(dealerTok)).expect(200); expect(own.body.bids).toHaveLength(1); expect(own.body.bids_count).toBe(3);
  });
  it('workshop accepts the dealer bid → request awarded, others rejected, part order + supplier invoice created (prepaid)', async () => {
    const r = await http().post(`/v1/parts/requests/${reqId}/accept`).set(auth(wsTok)).send({ bid_id: bids['dealer'], payment_terms: 'prepaid' }).expect(200);
    expect(r.body.request.status).toBe('awarded'); expect(r.body.request.awardedBidId).toBe(bids['dealer']); orderId = r.body.order.id;
    expect(r.body.order.number).toMatch(/^PO-\d{4}-\d{6}$/); expect(r.body.order.status).toBe('pending_payment'); expect(r.body.order.total).toBe('304.75'); // 265 + 15%
    const v = await http().get(`/v1/parts/requests/${reqId}`).set(auth(wsTok)).expect(200);
    expect(v.body.bids.find((b: { id: string }) => b.id === bids['scrap']).status).toBe('rejected'); expect(v.body.bids.find((b: { id: string }) => b.id === bids['dealer']).status).toBe('accepted');
    // second accept blocked
    await http().post(`/v1/parts/requests/${reqId}/accept`).set(auth(wsTok)).send({ bid_id: bids['scrap'] }).expect(409);
    const inv = await http().get(`/v1/invoices?org_id=${dealerOrg}`).set(auth(dealerTok)).expect(200); const mine = inv.body.find((i: { partOrderId: string | null }) => i.partOrderId === orderId); expect(mine).toBeDefined(); invoiceId = mine.id; expect(mine.total).toBe('304.75');
  });
  it('workshop pays the invoice (mock PSP) → escrow held for the dealer → order paid (outbox); dealer ships → delivered', async () => {
    const p = await http().post('/v1/payments').set(auth(wsTok)).send({ invoice_id: invoiceId, method: 'mada' }).expect(201);
    await http().post(`/v1/payments/${p.body.payment_id}/mock-pay`).set(auth(wsTok)).expect(200);
    await outbox.drain(500); await outbox.drain(500);
    const o = await http().get(`/v1/parts/orders/${orderId}`).set(auth(wsTok)).expect(200); expect(o.body.status).toBe('paid');
    await http().post(`/v1/parts/orders/${orderId}/transition`).set(auth(wsTok)).send({ to: 'shipped' }).expect(403); // buyer cannot ship
    await http().post(`/v1/parts/orders/${orderId}/transition`).set(auth(dealerTok)).send({ to: 'shipped' }).expect(200);
    await http().post(`/v1/parts/orders/${orderId}/transition`).set(auth(dealerTok)).send({ to: 'paid' }).expect(400);
    const d = await http().post(`/v1/parts/orders/${orderId}/transition`).set(auth(dealerTok)).send({ to: 'delivered' }).expect(200); expect(d.body.autoConfirmAt).toBeTruthy();
  });
  it('workshop confirms receipt → escrow released to the dealer, 365-day warranty issued to the workshop; dealer wallet shows available funds', async () => {
    const c = await http().post(`/v1/parts/orders/${orderId}/confirm`).set(auth(wsTok)).expect(200);
    expect(c.body.order.status).toBe('confirmed'); expect(c.body.released_holds).toBe(1); expect(c.body.warranties).toHaveLength(1);
    const w = await http().get(`/v1/parts/warranties?org_id=${wsOrg}`).set(auth(wsTok)).expect(200); const mine = w.body.find((x: { partOrderId: string }) => x.partOrderId === orderId); expect(mine.covers).toBe('part'); expect(mine.number).toMatch(/^WR-/);
    const pub = await http().get(`/v1/parts/warranty-check/${mine.qrToken}`).expect(200); expect(pub.body.valid).toBe(true);
    const wallet = await http().get(`/v1/organizations/${dealerOrg}/wallet`).set(auth(dealerTok)).expect(200); expect(Number(wallet.body.available)).toBeGreaterThan(0);
    await http().post(`/v1/parts/orders/${orderId}/confirm`).set(auth(wsTok)).expect(409);
  });
  it('bidding-window expiry job: a request past its end without award → expired, bids expired', async () => {
    const r = await http().post('/v1/parts/requests').set(auth(wsTok)).send({ org_id: wsOrg, part_name_ar: 'مراية يسار', bidding_minutes: 5 }).expect(201);
    await http().post(`/v1/parts/requests/${r.body.id}/bids`).set(auth(scrapTok)).send({ org_id: scrapOrg, condition: 'used_scrapyard', unit_price: '90' }).expect(200);
    const prisma = app.get(await import('../src/prisma').then((m) => m.PrismaService));
    await prisma.partRequest.update({ where: { id: r.body.id }, data: { biddingEndsAt: new Date(Date.now() - 60_000) } });
    const market = app.get(await import('../src/modules/parts/application/marketplace.use-cases').then((m) => m.MarketplaceUseCases));
    const res = await market.expireDue(); expect(res.expired).toBeGreaterThanOrEqual(1);
    const v = await http().get(`/v1/parts/requests/${r.body.id}`).set(auth(wsTok)).expect(200); expect(v.body.status).toBe('expired'); expect(v.body.bids[0].status).toBe('expired');
  });
});
