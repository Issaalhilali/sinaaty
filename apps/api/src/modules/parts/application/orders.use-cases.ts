import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { PartCondition, PartOrderStatus } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { Money } from '../../../common/domain/money';
import { computeLine } from '../../../common/domain/vat';
import { UNIT_OF_WORK, type TxHandle, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { InvoicesUseCases } from '../../invoicing/application/use-cases/invoices.use-cases';
import { EscrowService } from '../../payments/application/escrow.service';
import { ESCROW_REPOSITORY, type EscrowRepository } from '../../payments/domain/repositories';
import { NotesService } from '../../promissory-notes/application/notes.service';
import { VehicleEventsWriter } from '../../vehicles/application/vehicle-events.writer';
import type { PartBid, PartOrder, PartRequest } from '../domain/parts';
import { canOrder, creditAllows } from '../domain/parts';
import { PARTS_REPOSITORY, type PartsRepository } from '../domain/repositories';
import type { BuyNowDto, OrderTransitionDto } from './dto/parts.dto';

/** Part orders: from an accepted bid or Buy Now (catalog). Prepaid → invoice → PSP → escrow; deferred → trade account credit check → note. Confirm releases escrow + issues warranties. */
@Injectable()
export class OrdersUseCases {
  constructor(@Inject(PARTS_REPOSITORY) private readonly repo: PartsRepository, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly config: AppConfig, @Inject(forwardRef(() => InvoicesUseCases)) private readonly invoices: InvoicesUseCases, private readonly escrow: EscrowService, @Inject(ESCROW_REPOSITORY) private readonly holds: EscrowRepository, @Inject(forwardRef(() => NotesService)) private readonly notes: NotesService, private readonly passport: VehicleEventsWriter) {}
  private isBuyer(o: PartOrder, u: AuthUser) { return isPlatformStaff(u) || o.buyerUserId === u.id || (!!o.buyerOrgId && !!membership(u, o.buyerOrgId)); }
  private isSupplier(o: PartOrder, u: AuthUser) { return isPlatformStaff(u) || !!membership(u, o.supplierOrgId); }
  private totals(items: Array<{ quantity: number; unitPrice: string; vatRate: string }>, deliveryFee: string) { const lines = items.map((i) => computeLine({ quantity: i.quantity, unitPrice: Money.of(i.unitPrice), vatRatePct: Number(i.vatRate) })); const fee = Money.of(deliveryFee); const feeVat = fee.isZero() ? Money.ZERO : fee.percent(15); const subtotal = Money.sum(lines.map((l) => l.net)); const vat = Money.sum(lines.map((l) => l.vat)).plus(feeVat); return { lines, subtotal, vat, total: subtotal.plus(fee).plus(vat) }; }

  /** Deferred purchase on a trade account: active + within credit limit; outstanding grows by the order total (settled by note payment). */
  private async tradeCheck(tx: TxHandle, buyerOrgId: string | null, supplierOrgId: string, total: string) {
    if (!buyerOrgId) throw new AppError('VALIDATION', { messageAr: 'الشراء الآجل متاح للمنشآت فقط.', messageEn: 'Deferred purchase requires a buyer organization.' });
    const ta = await this.repo.findTradeAccountPair(supplierOrgId, buyerOrgId, tx);
    if (!ta || ta.status !== 'active') throw new AppError('FORBIDDEN', { messageAr: 'لا يوجد حساب آجل فعّال مع هذا المورّد — اطلب فتح حساب.', messageEn: 'No active trade account with this supplier.' });
    if (!creditAllows(ta, total)) throw new AppError('CONFLICT', { messageAr: `تجاوز الحد الائتماني: المتاح ${Money.of(ta.creditLimit).minus(Money.of(ta.outstanding)).format('ar')}.`, messageEn: 'Credit limit exceeded.', details: { credit_limit: ta.creditLimit, outstanding: ta.outstanding, order_total: total } });
    await this.repo.updateTradeAccount(ta.id, { outstandingDelta: total }, tx);
    return ta;
  }
  private async afterCreate(tx: TxHandle, u: AuthUser | null, o: PartOrder, ta: { id: string; paymentTermsDays: number } | null) {
    const inv = await this.invoices.issueForPartOrder({ partOrderId: o.id, orderNumber: o.number, supplierOrgId: o.supplierOrgId, buyerUserId: o.buyerUserId, buyerOrgId: o.buyerOrgId, items: o.items.map((i) => ({ descriptionAr: i.descriptionAr, quantity: i.quantity, unitPrice: i.unitPrice, vatRate: i.vatRate })), deliveryFee: o.deliveryFee, paymentTerms: o.paymentTerms, dueDate: ta ? new Date(Date.now() + ta.paymentTermsDays * 86_400_000) : null, actorUserId: u?.id ?? null }, tx);
    await this.audit.write(tx, { action: 'part_order.create', entityType: 'part_order', entityId: o.id, orgId: o.supplierOrgId, actorUserId: u?.id ?? null, after: { number: o.number, total: o.total, terms: o.paymentTerms, invoice: inv.number } });
    await this.outbox.publish(tx, { eventType: 'PartOrderCreated', aggregateType: 'part_order', aggregateId: o.id, payload: { number: o.number, supplierOrgId: o.supplierOrgId, buyerUserId: o.buyerUserId, buyerOrgId: o.buyerOrgId, total: o.total, paymentTerms: o.paymentTerms, invoiceId: inv.id, tradeAccountId: ta?.id ?? null, dueDate: ta ? new Date(Date.now() + ta.paymentTermsDays * 86_400_000).toISOString() : null } });
    return inv;
  }
  /** Called inside the marketplace accept() transaction. */
  async createFromBid(tx: TxHandle, u: AuthUser, r: PartRequest, bid: PartBid, paymentTerms: 'prepaid' | 'deferred'): Promise<PartOrder> {
    const t = this.totals([{ quantity: bid.quantity, unitPrice: bid.unitPrice, vatRate: bid.vatRate }], bid.deliveryFee);
    const ta = paymentTerms === 'deferred' ? await this.tradeCheck(tx, r.requesterOrgId, bid.supplierOrgId, t.total.toString()) : null;
    const number = await this.repo.nextNumber('PO', tx);
    const o = await this.repo.createOrder({ number, source: 'reverse_auction', requestId: r.id, bidId: bid.id, tradeAccountId: ta?.id ?? null, buyerUserId: r.requesterUserId, buyerOrgId: r.requesterOrgId, supplierOrgId: bid.supplierOrgId, workOrderId: r.workOrderId, paymentTerms, status: paymentTerms === 'deferred' ? 'paid' : 'pending_payment', subtotal: t.subtotal.toString(), deliveryFee: bid.deliveryFee, vatAmount: t.vat.toString(), total: t.total.toString(), autoConfirmAt: null, items: [{ inventoryId: bid.inventoryId, catalogId: null, descriptionAr: r.partNameAr, condition: bid.condition, quantity: bid.quantity, unitPrice: bid.unitPrice, vatRate: bid.vatRate, lineTotal: t.lines[0]!.net.toString(), warrantyDays: bid.warrantyDays }] }, tx);
    if (bid.inventoryId) await this.repo.adjustInventory(bid.inventoryId, { reserved: bid.quantity }, tx);
    await this.afterCreate(tx, u, o, ta);
    return o;
  }
  /** Buy Now from live inventory (distributor hub). All items must belong to one supplier. */
  async buyNow(u: AuthUser, dto: BuyNowDto) {
    if (dto.org_id && !membership(u, dto.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const invs = await Promise.all(dto.items.map(async (i) => { const inv = await this.repo.findInventory(i.inventory_id); if (!inv || !inv.isActive) throw new AppError('NOT_FOUND', { messageAr: 'القطعة غير متاحة.', messageEn: 'Inventory item not available.' }); if (inv.quantity - inv.reservedQty < i.quantity) throw new AppError('CONFLICT', { messageAr: `الكمية المتاحة من «${inv.titleAr}» غير كافية.`, messageEn: 'Insufficient stock.' }); return { inv, qty: i.quantity }; }));
    const supplierOrgId = invs[0]!.inv.orgId; if (invs.some((x) => x.inv.orgId !== supplierOrgId)) throw new AppError('VALIDATION', { messageAr: 'اجمع القطع من مورّد واحد في كل طلب.', messageEn: 'All items must be from the same supplier.' });
    const useTrade = dto.payment_terms === 'deferred';
    return this.uow.run(async (tx) => {
      const ta0 = useTrade && dto.org_id ? await this.repo.findTradeAccountPair(supplierOrgId, dto.org_id, tx) : null;
      const priced = invs.map((x) => ({ ...x, unitPrice: (ta0?.status === 'active' ? (x.inv.tradePrice ?? x.inv.price) : x.inv.price) ?? '0' }));
      if (priced.some((x) => Number(x.unitPrice) <= 0)) throw new AppError('VALIDATION', { messageAr: 'القطعة بلا سعر — اطلب عرضاً بدلاً من الشراء الفوري.', messageEn: 'Item has no price.' });
      const t = this.totals(priced.map((x) => ({ quantity: x.qty, unitPrice: x.unitPrice, vatRate: '15.00' })), '0');
      const ta = useTrade ? await this.tradeCheck(tx, dto.org_id ?? null, supplierOrgId, t.total.toString()) : null;
      const number = await this.repo.nextNumber('PO', tx);
      const catalogs = await Promise.all(priced.map((x) => (x.inv.catalogId ? this.repo.findCatalog(x.inv.catalogId) : Promise.resolve(null))));
      const o = await this.repo.createOrder({ number, source: 'catalog_buy_now', requestId: null, bidId: null, tradeAccountId: ta?.id ?? null, buyerUserId: dto.org_id ? null : u.id, buyerOrgId: dto.org_id ?? null, supplierOrgId, workOrderId: dto.work_order_id ?? null, paymentTerms: dto.payment_terms, status: useTrade ? 'paid' : 'pending_payment', subtotal: t.subtotal.toString(), deliveryFee: '0.00', vatAmount: t.vat.toString(), total: t.total.toString(), autoConfirmAt: null, items: priced.map((x, i) => ({ inventoryId: x.inv.id, catalogId: x.inv.catalogId, descriptionAr: catalogs[i] ? `${catalogs[i].nameAr} · ${catalogs[i].partNumber}` : x.inv.titleAr, condition: x.inv.condition, quantity: x.qty, unitPrice: x.unitPrice, vatRate: '15.00', lineTotal: t.lines[i]!.net.toString(), warrantyDays: x.inv.warrantyDays })) }, tx);
      for (const x of priced) await this.repo.adjustInventory(x.inv.id, { reserved: x.qty }, tx);
      const inv = await this.afterCreate(tx, u, o, ta);
      return { ...o, invoice_id: inv.id, invoice_number: inv.number };
    });
  }
  /** InvoicePaid (prepaid orders) → paid; escrow already holds the money for the supplier. */
  async onInvoicePaid(invoiceId: string) { const o = await this.repo.findOrderByInvoice(invoiceId); if (!o || o.status !== 'pending_payment') return null; await this.uow.run(async (tx) => { await this.repo.updateOrder(o.id, { status: 'paid' }, tx); await this.outbox.publish(tx, { eventType: 'PartOrderPaid', aggregateType: 'part_order', aggregateId: o.id, payload: { number: o.number, supplierOrgId: o.supplierOrgId, buyerUserId: o.buyerUserId, buyerOrgId: o.buyerOrgId, total: o.total } }); }); return o.id; }
  /** Deferred order created → promissory note on the trade account (outbox handler; idempotent). */
  async issueNoteForOrder(orderId: string) { const o = await this.repo.findOrder(orderId); if (!o || o.paymentTerms !== 'deferred' || !o.buyerOrgId || !o.tradeAccountId) return null; const ta = await this.repo.findTradeAccount(o.tradeAccountId); const inv = null; return this.notes.issueForPartOrder({ partOrderId: o.id, orderNumber: o.number, invoiceId: inv, creditorOrgId: o.supplierOrgId, debtorOrgId: o.buyerOrgId, amount: o.total, dueDate: new Date(o.createdAt.getTime() + (ta?.paymentTermsDays ?? 30) * 86_400_000) }); }
  /** Note closed on payment → trade account outstanding decreases. */
  async onNoteClosed(partOrderId: string, amount: string) { const o = await this.repo.findOrder(partOrderId); if (!o?.tradeAccountId) return; await this.uow.run((tx) => this.repo.updateTradeAccount(o.tradeAccountId!, { outstandingDelta: `-${amount}` }, tx)); }

  async get(u: AuthUser, id: string) { const o = await this.repo.findOrder(id); if (!o) throw new AppError('NOT_FOUND'); if (!this.isBuyer(o, u) && !this.isSupplier(o, u)) throw new AppError('FORBIDDEN'); return { ...o, warranties: await this.repo.listWarranties({ limit: 20, ...(o.buyerUserId ? { beneficiaryUserId: o.buyerUserId } : { beneficiaryOrgId: o.buyerOrgId! }) }).then((w) => w.filter((x) => x.partOrderId === o.id)) }; }
  async list(u: AuthUser, q: { org_id?: string; as?: 'buyer' | 'supplier'; status?: PartOrderStatus[]; limit?: number }) { if (q.org_id && !membership(u, q.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); if (q.as === 'supplier') { if (!q.org_id) throw new AppError('VALIDATION'); return this.repo.listOrders({ supplierOrgId: q.org_id, status: q.status, limit: q.limit ?? 50 }); } return this.repo.listOrders({ buyerUserId: q.org_id ? undefined : u.id, buyerOrgId: q.org_id, status: q.status, limit: q.limit ?? 50 }); }
  /** Supplier: preparing → shipped → delivered (delivered starts the auto-confirm clock). Cancel only before shipping. */
  async transition(u: AuthUser, id: string, dto: OrderTransitionDto) {
    const o = await this.repo.findOrder(id); if (!o) throw new AppError('NOT_FOUND'); if (!this.isSupplier(o, u) && !(dto.to === 'cancelled' && this.isBuyer(o, u))) throw new AppError('FORBIDDEN');
    if (!canOrder(o.status, dto.to)) throw new AppError('CONFLICT', { messageAr: `لا يمكن نقل الطلب من ${o.status} إلى ${dto.to}.`, messageEn: `Illegal transition ${o.status} → ${dto.to}.` });
    const now = new Date(); const auto = new Date(now.getTime() + this.config.get('PART_ORDER_AUTO_CONFIRM_HOURS') * 3_600_000);
    await this.uow.run(async (tx) => {
      await this.repo.updateOrder(id, { status: dto.to, ...(dto.to === 'shipped' ? { shippedAt: now } : {}), ...(dto.to === 'delivered' ? { deliveredAt: now, autoConfirmAt: auto } : {}), ...(dto.to === 'cancelled' ? { cancelledAt: now } : {}) }, tx);
      if (dto.to === 'shipped') for (const i of o.items) if (i.inventoryId) await this.repo.adjustInventory(i.inventoryId, { quantity: -i.quantity, reserved: -i.quantity }, tx);
      if (dto.to === 'cancelled') { for (const i of o.items) if (i.inventoryId) await this.repo.adjustInventory(i.inventoryId, { reserved: -i.quantity }, tx); if (o.tradeAccountId) await this.repo.updateTradeAccount(o.tradeAccountId, { outstandingDelta: `-${o.total}` }, tx); }
      await this.audit.write(tx, { action: `part_order.${dto.to}`, entityType: 'part_order', entityId: id, orgId: o.supplierOrgId, actorUserId: u.id, after: { from: o.status, to: dto.to, note: dto.note_ar ?? null } });
      await this.outbox.publish(tx, { eventType: 'PartOrderStatusChanged', aggregateType: 'part_order', aggregateId: id, payload: { number: o.number, from: o.status, to: dto.to, supplierOrgId: o.supplierOrgId, buyerUserId: o.buyerUserId, buyerOrgId: o.buyerOrgId, autoConfirmAt: dto.to === 'delivered' ? auto.toISOString() : null } });
    });
    return this.repo.findOrder(id);
  }
  /** Buyer confirms (or auto-confirm job): escrow released to the supplier, warranties issued for items with warranty_days > 0. */
  async confirm(u: AuthUser | null, id: string, reason: 'customer_confirmed' | 'auto_timeout' = 'customer_confirmed') {
    const o = await this.repo.findOrder(id); if (!o) throw new AppError('NOT_FOUND'); if (u && !this.isBuyer(o, u)) throw new AppError('FORBIDDEN');
    if (!canOrder(o.status, 'confirmed')) throw new AppError('CONFLICT', { messageAr: 'لا يمكن تأكيد الاستلام في هذه الحالة.', messageEn: `Cannot confirm from ${o.status}.` });
    const held = (await this.holds.listByPartOrder(o.id)).filter((h) => h.status === 'held');
    const warranties = await this.uow.run(async (tx) => {
      for (const h of held) await this.escrow.release(tx, h.id, reason, u?.id ?? null);
      await this.repo.updateOrder(id, { status: 'confirmed', confirmedAt: new Date() }, tx);
      const issued: string[] = [];
      for (const it of o.items) if (it.warrantyDays > 0) { const w = await this.issueWarranty(tx, { issuerOrgId: o.supplierOrgId, beneficiaryUserId: o.buyerUserId, beneficiaryOrgId: o.buyerOrgId, vehicleId: null, partOrderId: o.id, workOrderItemId: null, partSerialId: null, installerOrgId: null, covers: 'part', condition: it.condition, coverageAr: `ضمان القطعة «${it.descriptionAr}» ضد عيوب الصناعة لمدة ${it.warrantyDays} يوماً`, days: it.warrantyDays }); issued.push(w.number); }
      await this.audit.write(tx, { action: 'part_order.confirm', entityType: 'part_order', entityId: id, orgId: o.supplierOrgId, actorUserId: u?.id ?? null, actorType: u ? 'user' : 'system', after: { released: held.length, warranties: issued, reason } });
      await this.outbox.publish(tx, { eventType: 'PartOrderConfirmed', aggregateType: 'part_order', aggregateId: id, payload: { number: o.number, supplierOrgId: o.supplierOrgId, buyerUserId: o.buyerUserId, buyerOrgId: o.buyerOrgId, warranties: issued, released: held.map((h) => h.id) } });
      return issued;
    });
    return { order: await this.repo.findOrder(id), released_holds: held.length, warranties };
  }
  async autoConfirmDue(limit = 100) { const due = await this.repo.listOrders({ status: ['delivered', 'installed'], autoConfirmBefore: new Date(), limit }); let n = 0; for (const o of due) { try { await this.confirm(null, o.id, 'auto_timeout'); n++; } catch { /* raced */ } } return { confirmed: n, scanned: due.length }; }
  /** Shared warranty issuance (also used by serial install for part_and_labor). */
  async issueWarranty(tx: TxHandle, w: { issuerOrgId: string; beneficiaryUserId: string | null; beneficiaryOrgId: string | null; vehicleId: string | null; partOrderId: string | null; workOrderItemId: string | null; partSerialId: string | null; installerOrgId: string | null; covers: 'part' | 'labor' | 'part_and_labor'; condition: PartCondition | null; coverageAr: string; days: number }) {
    const number = await this.repo.nextNumber('WR', tx); const startsAt = new Date(); const endsAt = new Date(startsAt.getTime() + w.days * 86_400_000); const qrToken = randomBytes(24).toString('base64url');
    const content = { number, issuer: w.issuerOrgId, beneficiary: w.beneficiaryUserId ?? w.beneficiaryOrgId, part_order: w.partOrderId, serial: w.partSerialId, installer: w.installerOrgId, covers: w.covers, coverage: w.coverageAr, starts_at: startsAt.toISOString().slice(0, 10), ends_at: endsAt.toISOString().slice(0, 10) };
    const created = await this.repo.createWarranty({ number, qrToken, issuerOrgId: w.issuerOrgId, beneficiaryUserId: w.beneficiaryUserId, beneficiaryOrgId: w.beneficiaryOrgId, vehicleId: w.vehicleId, partOrderId: w.partOrderId, workOrderItemId: w.workOrderItemId, partSerialId: w.partSerialId, installerOrgId: w.installerOrgId, covers: w.covers, condition: w.condition, coverageAr: w.coverageAr, startsAt, endsAt, contentSha256: createHash('sha256').update(JSON.stringify(content)).digest('hex') }, tx);
    if (w.vehicleId) await this.passport.record({ vehicleId: w.vehicleId, type: 'warranty_issued', orgId: w.issuerOrgId, refTable: 'warranties', refId: created.id, summaryAr: `إصدار ضمان ${number} (${w.covers === 'part_and_labor' ? 'قطعة + تركيب' : w.covers === 'labor' ? 'تركيب' : 'قطعة'}) حتى ${content.ends_at}`, summaryEn: `Warranty ${number} issued until ${content.ends_at}`, isPublic: true }, tx);
    await this.outbox.publish(tx, { eventType: 'WarrantyIssued', aggregateType: 'warranty', aggregateId: created.id, payload: { number, beneficiaryUserId: w.beneficiaryUserId, beneficiaryOrgId: w.beneficiaryOrgId, covers: w.covers, endsAt: content.ends_at, issuerOrgId: w.issuerOrgId } });
    return created;
  }
}
