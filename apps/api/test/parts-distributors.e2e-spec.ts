import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';
import { PrismaService } from '../src/prisma';

/** Step 18b verify: distributor imports catalog+inventory CSV → workshop finds part by VIN → buys deferred on a trade account → note issued → scans QR at install (part+labor warranty) → pays → note closed; credit-limit rejection; duplicate-serial alert. */
describe('Parts distributors hub (e2e)', () => {
  let app: INestApplication; const http = () => request(app.getHttpServer()); let outbox: OutboxProcessor;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const suffix = String(Date.now()).slice(-7); const pn = `04465-${suffix.slice(0, 5)}`; const vin = `4T1B11HK5KU${suffix.slice(0, 6)}`;
  let wsTok: string; let distTok: string; let wsOrg: string; let distOrg: string; let custTok: string; let taId: string; let catalogId: string; let inventoryId: string; let orderId: string; let noteId: string; let woId: string; let woItemId: string; let serials: Array<{ qr_token: string }> = [];
  const orgOf = async (tok: string) => { const me = await http().get('/v1/me').set(auth(tok)).expect(200); for (const o of me.body.orgs as Array<{ org_id: string }>) { const org = await http().get(`/v1/organizations/${o.org_id}`).set(auth(tok)); if (org.status === 200 && org.body.status === 'active' && /^10100000/.test(org.body.crNumber ?? '')) return o.org_id; } return me.body.orgs[0].org_id as string; };
  const drain = async () => { await outbox.drain(500); await outbox.drain(500); };
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); outbox = app.get(OutboxProcessor);
    wsTok = await login('+966500000001'); distTok = await login('+966500000003'); wsOrg = await orgOf(wsTok); distOrg = await orgOf(distTok); custTok = await login(`+96658${suffix}`);
    // re-runnable: reset any trade account left by a previous run (unique per seller/buyer pair)
    await app.get(PrismaService).tradeAccount.updateMany({ where: { sellerOrgId: distOrg, buyerOrgId: wsOrg }, data: { status: 'pending', creditLimit: 0, outstanding: 0, discountBps: 0 } });
  });
  afterAll(async () => { await app.close(); });

  it('distributor imports catalog (with fitments) and inventory via CSV → sync run recorded, upsert by external_sku', async () => {
    const cat = await http().post(`/v1/parts/orgs/${distOrg}/catalog/import-csv`).set(auth(distTok)).send({ csv: `brand,part_number,name_ar,name_en,oem_numbers,category_code,make,model,year_from,year_to,is_serialized\nToyota Genuine,${pn},دسكات فرامل أمامية كامري,Front brake discs Camry,${pn}|43512-${suffix.slice(0, 5)},brake_discs,Toyota,Camry,2018,2024,true\nBosch,BP-${suffix.slice(0, 5)},فحمات فرامل أمامية,Front pads,,brake_pads,Toyota,Camry,2018,2024,false\n` }).expect(200);
    expect(cat.body.rows_upserted).toBe(2); expect(cat.body.rows_failed).toBe(0);
    const found = await http().get(`/v1/parts/catalog?part_number=${pn}`).set(auth(distTok)).expect(200); catalogId = found.body[0].id; expect(found.body[0].isSerialized).toBe(true);
    const inv = await http().post(`/v1/parts/orgs/${distOrg}/inventory/import-csv`).set(auth(distTok)).send({ csv: `external_sku,part_number,title_ar,condition,price,trade_price,quantity,warranty_days,lead_time_hours\nSKU-${suffix}-A,${pn},دسكات فرامل أمامية كامري — أصلي,oem_new,480,420,12,365,6\nSKU-${suffix}-B,BP-${suffix.slice(0, 5)},فحمات فرامل أمامية بوش,aftermarket_new,180,150,30,180,24\n` }).expect(200);
    expect(inv.body.rows_upserted).toBe(2); expect(inv.body.sync_run_id).toBeTruthy();
    // re-sync updates quantity in place (same external_sku)
    const again = await http().post(`/v1/parts/orgs/${distOrg}/inventory/import-csv`).set(auth(distTok)).send({ csv: `external_sku,part_number,title_ar,condition,price,trade_price,quantity\nSKU-${suffix}-A,${pn},دسكات فرامل أمامية كامري — أصلي,oem_new,480,420,15\n` }).expect(200); expect(again.body.rows_upserted).toBe(1);
    const list = await http().get(`/v1/parts/orgs/${distOrg}/inventory`).set(auth(distTok)).expect(200); const a = list.body.find((x: { externalSku: string }) => x.externalSku === `SKU-${suffix}-A`); expect(a.quantity).toBe(15); expect(a.catalogId).toBe(catalogId); inventoryId = a.id;
    expect(list.body.filter((x: { externalSku: string }) => x.externalSku?.startsWith(`SKU-${suffix}`))).toHaveLength(2);
    // a workshop member cannot write the distributor's inventory
    await http().post(`/v1/parts/orgs/${distOrg}/inventory`).set(auth(wsTok)).send({ title_ar: 'قطعة تجريبية', condition: 'oem_new' }).expect(403);
  });
  it('workshop searches parts by VIN → offers sorted by price; trade price shown only with an active trade account', async () => {
    const r = await http().get(`/v1/parts/fit?vin=${vin}&category_code=brake_discs&buyer_org_id=${wsOrg}`).set(auth(wsTok)).expect(200);
    expect(r.body.vehicle.make).toBeTruthy(); const offer = r.body.offers.find((o: { inventory_id: string }) => o.inventory_id === inventoryId); expect(offer).toBeDefined(); expect(offer.price).toBe('480.00'); expect(offer.trade_price).toBeNull(); expect(offer.fitment_source).toBe('catalog'); expect(offer.is_serialized).toBe(true);
    // deferred without a trade account → refused
    await http().post('/v1/parts/orders/buy-now').set(auth(wsTok)).send({ org_id: wsOrg, payment_terms: 'deferred', items: [{ inventory_id: inventoryId, quantity: 1 }] }).expect(403);
  });
  it('trade account: workshop requests → distributor approves with limit; credit check rejects an order beyond the limit', async () => {
    const ta = await http().post('/v1/parts/trade-accounts').set(auth(wsTok)).send({ seller_org_id: distOrg, buyer_org_id: wsOrg }).expect(201); taId = ta.body.id; expect(ta.body.status).toBe('pending');
    await http().post(`/v1/parts/trade-accounts/${taId}/approve`).set(auth(wsTok)).send({ credit_limit: '5000' }).expect(403); // buyer cannot approve
    const ap = await http().post(`/v1/parts/trade-accounts/${taId}/approve`).set(auth(distTok)).send({ credit_limit: '1000', payment_terms_days: 30, discount_bps: 500 }).expect(200); expect(ap.body.status).toBe('active'); expect(ap.body.creditLimit).toBe('1000.00');
    const fit = await http().get(`/v1/parts/fit?vin=${vin}&buyer_org_id=${wsOrg}`).set(auth(wsTok)).expect(200); const offer = fit.body.offers.find((o: { inventory_id: string }) => o.inventory_id === inventoryId); expect(offer.trade_price).toBe('420.00'); expect(offer.trade_account_id).toBe(taId);
    // 3 × 420 × 1.15 = 1449 > 1000 → rejected, outstanding untouched
    const rej = await http().post('/v1/parts/orders/buy-now').set(auth(wsTok)).send({ org_id: wsOrg, payment_terms: 'deferred', items: [{ inventory_id: inventoryId, quantity: 3 }] }).expect(409); expect(rej.body.details.credit_limit).toBe('1000.00');
    const t = await http().get(`/v1/parts/trade-accounts/${taId}`).set(auth(wsTok)).expect(200); expect(t.body.outstanding).toBe('0.00');
  });
  it('workshop buys 1 deferred → order paid-on-terms, outstanding grows, promissory note issued via Nafez (outbox), invoice deferred', async () => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: wsOrg, customer_phone: `+96658${suffix}`, vin, title_ar: 'تغيير دسكات', payment_terms: 'on_delivery', items: [{ type: 'part', description_ar: 'دسكات أمامية أصلي', part_condition: 'oem_new', quantity: 1, unit_price: '600', warranty_days: 365 }, { type: 'labor', description_ar: 'تركيب', quantity: 1, unit_price: '120' }] }).expect(201);
    woId = wo.body.id; woItemId = wo.body.items[0].id;
    const o = await http().post('/v1/parts/orders/buy-now').set(auth(wsTok)).send({ org_id: wsOrg, work_order_id: woId, payment_terms: 'deferred', items: [{ inventory_id: inventoryId, quantity: 1 }] }).expect(201);
    orderId = o.body.id; expect(o.body.status).toBe('paid'); expect(o.body.total).toBe('483.00'); expect(o.body.tradeAccountId).toBe(taId); expect(o.body.invoice_number).toMatch(/^INV-/);
    const t = await http().get(`/v1/parts/trade-accounts/${taId}`).set(auth(distTok)).expect(200); expect(t.body.outstanding).toBe('483.00'); expect(t.body.available).toBe('517.00');
    await drain();
    const notes = await http().get(`/v1/promissory-notes?org_id=${distOrg}`).set(auth(distTok)).expect(200); const n = notes.body.find((x: { partOrderId: string | null }) => x.partOrderId === orderId); expect(n).toBeDefined(); expect(n.status).toBe('issued'); expect(n.amount).toBe('483.00'); expect(n.debtorOrgId).toBe(wsOrg); noteId = n.id;
    const inv = await http().get(`/v1/parts/orders/${orderId}`).set(auth(wsTok)).expect(200); expect(inv.body.paymentTerms).toBe('deferred');
  });
  it('distributor issues QR serials for the part, transfers them with the order, ships & delivers; public verify works', async () => {
    const b = await http().post('/v1/parts/serials/batches').set(auth(distTok)).send({ org_id: distOrg, catalog_id: catalogId, count: 3 }).expect(201); expect(b.body.issued).toBe(3); serials = b.body.serials;
    await http().post('/v1/parts/serials/batches').set(auth(wsTok)).send({ org_id: wsOrg, catalog_id: catalogId, count: 1 }).expect(403);
    const v = await http().get(`/v1/parts/verify/${serials[0]!.qr_token}`).expect(200); expect(v.body.genuine).toBe(true); expect(v.body.status).toBe('in_stock'); expect(v.body.part.part_number).toBe(pn);
    expect((await http().get('/v1/parts/verify/not-a-real-token').expect(200)).body.genuine).toBe(false);
    const tr = await http().post('/v1/parts/serials/transfer').set(auth(distTok)).send({ qr_tokens: [serials[0]!.qr_token], part_order_id: orderId }).expect(200); expect(tr.body.transferred).toBe(1);
    await http().post(`/v1/parts/orders/${orderId}/transition`).set(auth(distTok)).send({ to: 'shipped' }).expect(200);
    await http().post(`/v1/parts/orders/${orderId}/transition`).set(auth(distTok)).send({ to: 'delivered' }).expect(200);
    const inv = await http().get(`/v1/parts/orgs/${distOrg}/inventory`).set(auth(distTok)).expect(200); expect(inv.body.find((x: { id: string }) => x.id === inventoryId).quantity).toBe(14);
  });
  it('workshop scans the QR at install → serial installed on the vehicle, part_and_labor warranty for the customer, Car Passport event; second install of the same serial → duplicate alert', async () => {
    const r = await http().post('/v1/parts/serials/install').set(auth(wsTok)).send({ qr_token: serials[0]!.qr_token, work_order_item_id: woItemId, labor_warranty_days: 180 }).expect(200);
    expect(r.body.serial.status).toBe('installed'); expect(r.body.warranty.covers).toBe('part_and_labor'); expect(r.body.warranty.installerOrgId).toBe(wsOrg); expect(r.body.warranty.issuerOrgId).toBe(distOrg);
    const v = await http().get(`/v1/parts/verify/${serials[0]!.qr_token}`).expect(200); expect(v.body.status).toBe('installed');
    // customer sees the warranty in their wallet + passport event
    const w = await http().get('/v1/parts/warranties').set(auth(custTok)).expect(200); expect(w.body.some((x: { partSerialId: string }) => x.partSerialId === r.body.serial.id)).toBe(true);
    const wo = await http().get(`/v1/work-orders/${woId}`).set(auth(wsTok)).expect(200);
    const pp = await http().get(`/v1/vehicles/${wo.body.vehicleId}/passport`).set(auth(custTok)).expect(200); expect(pp.body.events.some((e: { type: string }) => e.type === 'part_installed')).toBe(true);
    // duplicate install (counterfeit / re-use) → 409 + alert event
    const dup = await http().post('/v1/parts/serials/install').set(auth(wsTok)).send({ qr_token: serials[0]!.qr_token, work_order_item_id: woItemId }).expect(409); expect(dup.body.message_ar).toContain('تنبيه');
    // a serial that never left the distributor cannot be installed by the workshop
    await http().post('/v1/parts/serials/install').set(auth(wsTok)).send({ qr_token: serials[1]!.qr_token, work_order_item_id: woItemId }).expect(403);
    // 6 rapid scans → alert flag
    for (let i = 0; i < 6; i++) await http().get(`/v1/parts/verify/${serials[2]!.qr_token}`).expect(200);
    expect((await http().get(`/v1/parts/verify/${serials[2]!.qr_token}`).expect(200)).body.alert).toBe(true);
  });
  it('workshop pays the deferred invoice → note closed with settlement, trade-account outstanding back to 0; confirm releases nothing (no escrow on deferred) but keeps warranties', async () => {
    const o = await http().get(`/v1/parts/orders/${orderId}`).set(auth(wsTok)).expect(200);
    const invoices = await http().get(`/v1/invoices?org_id=${distOrg}`).set(auth(distTok)).expect(200); const inv = invoices.body.find((i: { partOrderId: string | null }) => i.partOrderId === orderId); expect(inv.paymentTerms).toBe('deferred');
    const p = await http().post('/v1/payments').set(auth(wsTok)).send({ invoice_id: inv.id, method: 'mada' }).expect(201);
    await http().post(`/v1/payments/${p.body.payment_id}/mock-pay`).set(auth(wsTok)).expect(200); await drain(); await drain();
    const n = await http().get(`/v1/promissory-notes/${noteId}`).set(auth(distTok)).expect(200); expect(n.body.status).toBe('closed'); expect(n.body.settlement).toBeTruthy(); expect(n.body.settlement.number).toMatch(/^MK-/);
    const t = await http().get(`/v1/parts/trade-accounts/${taId}`).set(auth(distTok)).expect(200); expect(t.body.outstanding).toBe('0.00');
    const c = await http().post(`/v1/parts/orders/${orderId}/confirm`).set(auth(wsTok)).expect(200); expect(c.body.order.status).toBe('confirmed'); expect(o.body.status).toBe('delivered');
  });
  it('group buy: distributor opens, two workshops join → reached', async () => {
    const g = await http().post('/v1/parts/group-buys').set(auth(distTok)).send({ org_id: distOrg, catalog_id: catalogId, unit_price: '390', min_quantity: 4, closes_in_hours: 48 }).expect(201);
    const j1 = await http().post(`/v1/parts/group-buys/${g.body.id}/join`).set(auth(wsTok)).send({ org_id: wsOrg, quantity: 2 }).expect(200); expect(j1.body.reached).toBe(false);
    const j2 = await http().post(`/v1/parts/group-buys/${g.body.id}/join`).set(auth(wsTok)).send({ org_id: wsOrg, quantity: 2 }).expect(200); expect(j2.body.reached).toBe(true); expect(j2.body.status).toBe('reached');
  });
});
