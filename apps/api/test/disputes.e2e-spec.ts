import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/** Step 16 verify: open dispute → escrow frozen (auto-release skips it) → evidence/messages → ops split decision → ledger balanced → review after close. */
describe('Disputes (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor; const http = () => request(app.getHttpServer());
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` }); const suffix = String(Date.now()).slice(-7); const custPhone = `+96659${suffix}`;
  let wsTok: string; let custTok: string; let adminTok: string; let orgId: string; let woId: string; let holdId: string; let disputeId: string; let invoiceId: string;
  const imbalance = async () => (await prisma.$queryRaw<Array<{ b: string }>>`SELECT COALESCE(SUM(debit) - SUM(credit), 0)::text AS b FROM ledger_lines`)[0]!.b;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    wsTok = await login('+966500000001'); custTok = await login(custPhone); adminTok = await login('+966500000099');
    orgId = (await http().get('/v1/me').set(auth(wsTok)).expect(200)).body.orgs[0].org_id;
    // work order → approved → executed → delivered, paid (money sits in escrow)
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: custPhone, plate: `ن ز ع ${suffix.slice(0, 4)}`, title_ar: 'صيانة متنازع عليها', payment_terms: 'on_delivery', items: [{ type: 'labor', description_ar: 'إصلاح ناقل الحركة', quantity: 1, unit_price: '1000' }] }).expect(201);
    woId = wo.body.id;
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    const init = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    for (const to of ['quality_check', 'ready']) await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to }).expect(200);
    const inv = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: woId }).expect(201); invoiceId = inv.body.id;
    const p = await http().post('/v1/payments').set(auth(custTok)).send({ invoice_id: invoiceId, method: 'mada' }).expect(201);
    await http().post(`/v1/payments/${p.body.payment_id}/mock-pay`).set(auth(custTok)).expect(200);
    const holds = await prisma.escrowHold.findMany({ where: { workOrderId: woId } }); holdId = holds[0]!.id; expect(holds[0]!.status).toBe('held');
  });
  afterAll(async () => { await app.close(); });

  it('customer opens a dispute → escrow frozen, work order moves to disputed through its own state machine (history row)', async () => {
    expect(await imbalance()).toBe('0.00');
    const media = await http().post('/v1/media/presign').set(auth(custTok)).send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 900, sha256: 'd'.repeat(64), purpose: 'dispute' }).expect(200);
    const d = await http().post('/v1/disputes').set(auth(custTok)).send({ work_order_id: woId, category: 'quality', description_ar: 'الأعطال ما زالت موجودة بعد الاستلام والصوت يتكرر', claimed_amount: '600', media_ids: [media.body.media_id] }).expect(201);
    disputeId = d.body.id; expect(d.body.number).toMatch(/^DS-\d{4}-\d{6}$/); expect(d.body.escrow_frozen).toBe(true); expect(d.body.status).toBe('open');
    const hold = await prisma.escrowHold.findUnique({ where: { id: holdId } }); expect(hold!.status).toBe('frozen'); expect(hold!.disputeId).toBe(disputeId);
    const wo = await http().get(`/v1/work-orders/${woId}`).set(auth(wsTok)).expect(200); expect(wo.body.status).toBe('disputed');
    const tl = await http().get(`/v1/work-orders/${woId}/timeline`).set(auth(wsTok)).expect(200); expect(tl.body.history.map((h: { to: string }) => h.to)).toContain('disputed');
    // a second dispute on the same order is refused; a stranger cannot read this one
    await http().post('/v1/disputes').set(auth(wsTok)).send({ work_order_id: woId, category: 'price', description_ar: 'اعتراض مقابل على السعر المطلوب' }).expect(409);
    const stranger = await login(`+96653${suffix}`); await http().get(`/v1/disputes/${disputeId}`).set(auth(stranger)).expect(403);
  });
  it('frozen escrow is skipped by the auto-release job (money cannot leave during a dispute)', async () => {
    await prisma.escrowHold.update({ where: { id: holdId }, data: { autoReleaseAt: new Date(Date.now() - 3_600_000) } });
    await http().post('/v1/admin/escrow/release-due').set(auth(adminTok)).send({}).expect(200);
    expect((await prisma.escrowHold.findUnique({ where: { id: holdId } }))!.status).toBe('frozen');
  });
  it('both sides exchange messages; ops internal notes stay hidden from the parties', async () => {
    await http().post(`/v1/disputes/${disputeId}/messages`).set(auth(wsTok)).send({ body_ar: 'أعدنا الفحص والعطل مختلف عن البند المتفق عليه' }).expect(201);
    await http().post(`/v1/disputes/${disputeId}/messages`).set(auth(custTok)).send({ body_ar: 'الصوت يتكرر بعد يومين من الاستلام' }).expect(201);
    await http().post(`/v1/admin/disputes/${disputeId}/messages`).set(auth(adminTok)).send({ body_ar: 'ملاحظة داخلية: الفحص يرجّح خطأ جزئياً من الورشة', is_internal: true }).expect(201);
    await http().post(`/v1/disputes/${disputeId}/messages`).set(auth(custTok)).send({ body_ar: 'محاولة ملاحظة داخلية', is_internal: true }).expect(403);
    const asParty = await http().get(`/v1/disputes/${disputeId}`).set(auth(custTok)).expect(200);
    expect(asParty.body.messages).toHaveLength(2); expect(asParty.body.messages.every((m: { isInternal: boolean }) => !m.isInternal)).toBe(true); expect(asParty.body.media).toHaveLength(1);
    const asOps = await http().get(`/v1/admin/disputes/${disputeId}`).set(auth(adminTok)).expect(200); expect(asOps.body.messages).toHaveLength(3); expect(asOps.body.escrow.status).toBe('frozen');
  });
  it('ops assigns + reviews, then splits: 600 back to the customer, the rest released — ledger stays balanced', async () => {
    const me = await http().get('/v1/me').set(auth(adminTok)).expect(200);
    await http().put(`/v1/admin/disputes/${disputeId}/assign`).set(auth(adminTok)).send({ assigned_to: me.body.id, reason_ar: 'استلام الوسيط للقضية' }).expect(200);
    const st = await http().put(`/v1/admin/disputes/${disputeId}/status`).set(auth(adminTok)).send({ status: 'awaiting_parties', reason_ar: 'بانتظار تقرير فحص محايد' }).expect(200); expect(st.body.status).toBe('awaiting_parties');
    await http().put(`/v1/admin/disputes/${disputeId}/status`).set(auth(adminTok)).send({ status: 'closed', reason_ar: 'محاولة إغلاق قبل القرار' }).expect(409); // money still frozen
    await http().post(`/v1/admin/disputes/${disputeId}/resolve`).set(auth(wsTok)).send({ resolution: 'split', amount_to_customer: '600', note_ar: 'تسوية' }).expect(403);
    await http().post(`/v1/admin/disputes/${disputeId}/resolve`).set(auth(adminTok)).send({ resolution: 'split', note_ar: 'بلا مبلغ' }).expect(400);
    await http().post(`/v1/admin/disputes/${disputeId}/resolve`).set(auth(adminTok)).send({ resolution: 'split', amount_to_customer: '99999', note_ar: 'مبلغ أكبر من المحفوظ' }).expect(400);
    const r = await http().post(`/v1/admin/disputes/${disputeId}/resolve`).set(auth(adminTok)).send({ resolution: 'split', amount_to_customer: '600', note_ar: 'خطأ جزئي من الورشة: يُعاد 600 للعميل والباقي للورشة' }).expect(200);
    expect(r.body.status).toBe('resolved'); expect(r.body.resolution).toBe('split'); expect(r.body.resolutionAmountToCustomer).toBe('600.00');
    const hold = await prisma.escrowHold.findUnique({ where: { id: holdId } });
    expect(hold!.refundedAmount.toFixed(2)).toBe('600.00'); expect(hold!.status).toBe('released'); expect(Number(hold!.releasedAmount)).toBeGreaterThan(0);
    expect(await imbalance()).toBe('0.00');
    const audit = await http().get('/v1/admin/audit?action=dispute.resolve&limit=1').set(auth(adminTok)).expect(200);
    expect(audit.body[0].after.to_customer).toBe('600.00'); expect(audit.body[0].after.note).toContain('خطأ جزئي');
  });
  it('both sides are notified: dispute opened + decision (SMS for the legal ones)', async () => {
    await outbox.drain(500); await outbox.drain(500);
    const inbox = await http().get('/v1/me/notifications?limit=50').set(auth(custTok)).expect(200);
    const codes = inbox.body.map((n: { templateCode: string }) => n.templateCode);
    expect(codes).toContain('dispute.opened'); expect(codes).toContain('dispute.resolved');
    const resolved = inbox.body.find((n: { templateCode: string }) => n.templateCode === 'dispute.resolved');
    expect(resolved.bodyAr).toContain('600.00'); expect(resolved.data.deep_link).toBe(`sinaaty://disputes/${disputeId}`);
  });
  it('resolved dispute closes; customer rates the workshop once → org rating refreshed', async () => {
    await http().put(`/v1/admin/disputes/${disputeId}/status`).set(auth(adminTok)).send({ status: 'closed', reason_ar: 'انتهاء القضية بعد التسوية' }).expect(200);
    const rev = await http().post('/v1/reviews').set(auth(custTok)).send({ work_order_id: woId, rating: 3, dimensions: { price: 3, quality: 2, timeliness: 4 }, comment_ar: 'حُلّت المشكلة بعد تدخل المنصة' }).expect(201);
    expect(rev.body.rating).toBe(3); expect(Number(rev.body.org_rating.avg)).toBeGreaterThan(0);
    await http().post('/v1/reviews').set(auth(custTok)).send({ work_order_id: woId, rating: 5 }).expect(409); // one review per order
    await http().post('/v1/reviews').set(auth(wsTok)).send({ work_order_id: woId, rating: 5 }).expect(403); // provider cannot rate itself
    const list = await http().get(`/v1/organizations/${orgId}/reviews`).expect(200); expect(list.body.some((x: { workOrderId: string }) => x.workOrderId === woId)).toBe(true);
    const org = await prisma.organization.findUnique({ where: { id: orgId } }); expect(org!.ratingCount).toBeGreaterThan(0);
  });
});
