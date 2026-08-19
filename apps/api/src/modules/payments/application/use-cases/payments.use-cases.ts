import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PaymentMethod } from '@sinaaty/shared-types';
import { AppError } from '../../../../common/errors';
import { AppConfig } from '../../../../config';
import { AuditLogWriter } from '../../../../common/audit';
import { OutboxWriter } from '../../../../common/outbox';
import { Money } from '../../../../common/domain/money';
import { newId } from '../../../../common/domain/ids';
import { UNIT_OF_WORK, type TxHandle, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { isPlatformStaff } from '../../../identity/domain/auth-user';
import { HASHER_PORT, type HasherPort } from '../../../identity/application/ports/hasher.port';
import { OTP_REPOSITORY, type OtpRepository, USER_REPOSITORY, type UserRepository } from '../../../identity/domain/repositories';
import { INVOICE_REPOSITORY, type InvoiceRepository } from '../../../invoicing/domain/repositories';
import type { Invoice } from '../../../invoicing/domain/invoice';
import { REALTIME_PUBLISHER, type RealtimePublisher } from '../../../work-orders/application/ports/realtime.port';
import { ESCROW_REPOSITORY, type EscrowRepository, PAYMENT_REPOSITORY, type PaymentRepository, WEBHOOK_INBOX, type WebhookInbox } from '../../domain/repositories';
import { PSP_PORT, type PspPort, type PspWebhookEvent } from '../ports/psp.port';
import { EscrowService } from '../escrow.service';
import type { CashConfirmDto, CashInitDto, CreatePaymentDto } from '../dto/payments.dto';

const FINANCE = ['owner', 'manager', 'accountant'];

@Injectable()
export class PaymentsUseCases {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(ESCROW_REPOSITORY) private readonly holds: EscrowRepository,
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(WEBHOOK_INBOX) private readonly inbox: WebhookInbox,
    @Inject(PSP_PORT) private readonly psp: PspPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(HASHER_PORT) private readonly hasher: HasherPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly escrow: EscrowService, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly config: AppConfig,
    @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher,
  ) {}

  private isPayer(inv: Invoice, u: AuthUser) { return inv.customerUserId === u.id || (inv.customerOrgId != null && u.orgs.some((o) => o.orgId === inv.customerOrgId)); }
  private remaining(inv: Invoice) { return Money.of(inv.total).minus(Money.of(inv.paidTotal)); }
  private async payableInvoice(id: string) {
    const inv = await this.invoices.findById(id); if (!inv) throw new AppError('NOT_FOUND');
    if (!['issued', 'sent', 'partially_paid', 'overdue'].includes(inv.status) || this.remaining(inv).isZero()) throw new AppError('PAY_INVOICE_NOT_PAYABLE');
    return inv;
  }

  /** Customer starts an online payment: creates a PSP intent for the remaining amount. */
  async createIntent(u: AuthUser, dto: CreatePaymentDto) {
    const inv = await this.payableInvoice(dto.invoice_id);
    if (!this.isPayer(inv, u) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (await this.payments.findPendingForInvoice(inv.id)) throw new AppError('PAY_INTENT_PENDING');
    const amount = this.remaining(inv).toString(); const paymentId = newId();
    const intent = await this.psp.createIntent({ paymentId, amount, currency: 'SAR', method: dto.method, description: `فاتورة ${inv.number} — ${inv.sellerSnapshot.name_ar}`, metadata: { invoice_id: inv.id, invoice_number: inv.number, org_id: inv.orgId } });
    const p = await this.payments.create({ invoiceId: inv.id, workOrderId: inv.workOrderId ?? undefined, partOrderId: inv.partOrderId ?? undefined, payerUserId: inv.customerUserId ?? undefined, payerOrgId: inv.customerOrgId ?? undefined, payeeOrgId: inv.orgId, method: dto.method, amount, pspProvider: this.psp.provider, pspIntentId: intent.intentId, idempotencyKey: `intent:${paymentId}`, status: 'pending' });
    return { payment_id: p.id, amount, currency: 'SAR', intent: { id: intent.intentId, client_secret: intent.clientSecret, redirect_url: intent.redirectUrl, expires_at: intent.expiresAt.toISOString() } };
  }

  /** PSP webhook: verify → inbox (idempotent) → capture → escrow hold + ledger → invoice paid → outbox InvoicePaid. */
  async handleWebhook(rawBody: string, headers: Record<string, string | undefined>) {
    let ev: PspWebhookEvent;
    const provider = 'psp'; const key = (id: string) => `${this.psp.provider}:${id}`;
    try { ev = this.psp.parseWebhook(rawBody, headers); } catch (e) { await this.inbox.record({ provider, providerEventId: key(`invalid:${newId()}`), eventType: 'invalid', signatureValid: false, payload: { rawLength: rawBody.length } }); throw e; }
    const stored = await this.inbox.record({ provider, providerEventId: key(ev.eventId), eventType: ev.type, signatureValid: true, headers: { ...headers, authorization: undefined }, payload: ev.raw });
    if (!stored.inserted) return { ok: true, replay: true };
    try {
      if (ev.type === 'payment.succeeded') await this.onPaymentSucceeded(ev);
      else if (ev.type === 'payment.failed') await this.onPaymentFailed(ev);
      await this.inbox.markProcessed(provider, key(ev.eventId));
      return { ok: true, replay: false };
    } catch (e) { await this.inbox.markProcessed(provider, key(ev.eventId), (e as Error).message); throw e; }
  }
  private async onPaymentSucceeded(ev: PspWebhookEvent) {
    const p = await this.payments.findByIntent(this.psp.provider, ev.intentId); if (!p) throw new AppError('NOT_FOUND', { messageEn: `payment for intent ${ev.intentId} not found` });
    if (p.status === 'captured') return; // idempotent at the payment level too
    if (Money.of(ev.amount).toString() !== Money.of(p.amount).toString()) throw new AppError('CONFLICT', { messageEn: 'webhook amount mismatch', details: { expected: p.amount, got: ev.amount } });
    await this.uow.run(async (tx) => {
      await this.payments.update(p.id, { status: 'captured', pspChargeId: ev.chargeId, capturedAt: ev.occurredAt, pspPayload: ev.raw }, tx);
      await this.escrow.hold(tx, { paymentId: p.id, orgId: p.payeeOrgId, amount: p.amount, workOrderId: p.workOrderId, partOrderId: p.partOrderId, providerRef: ev.chargeId });
      if (p.invoiceId) await this.markInvoicePaid(tx, p.invoiceId, p.amount, p.id, p.method);
      await this.audit.write(tx, { action: 'payment.captured', entityType: 'payment', entityId: p.id, orgId: p.payeeOrgId, actorType: 'webhook', after: { amount: p.amount, method: p.method, chargeId: ev.chargeId } });
    });
    if (p.workOrderId) this.rt?.publish(`work-order:${p.workOrderId}`, 'payment', { work_order_id: p.workOrderId, payment_id: p.id, amount: p.amount, status: 'captured' });
  }
  private async onPaymentFailed(ev: PspWebhookEvent) {
    const p = await this.payments.findByIntent(this.psp.provider, ev.intentId); if (!p || p.status === 'captured') return;
    await this.payments.update(p.id, { status: 'failed', failureReason: 'psp_failed', pspPayload: ev.raw });
  }
  private async markInvoicePaid(tx: TxHandle, invoiceId: string, amount: string, paymentId: string, method: PaymentMethod) {
    const inv = await this.invoices.findById(invoiceId); if (!inv) return;
    const paid = Money.of(inv.paidTotal).plus(Money.of(amount)); const full = paid.gte(Money.of(inv.total));
    await this.invoices.setStatus(inv.id, full ? 'paid' : 'partially_paid', { paidTotal: paid.toString() }, tx);
    await this.outbox.publish(tx, { eventType: full ? 'InvoicePaid' : 'InvoicePartiallyPaid', aggregateType: 'invoice', aggregateId: inv.id, payload: { number: inv.number, orgId: inv.orgId, workOrderId: inv.workOrderId, partOrderId: inv.partOrderId, customerUserId: inv.customerUserId, customerOrgId: inv.customerOrgId, paymentId, method, amount, paidTotal: paid.toString(), total: inv.total } });
  }

  /** Cash at the counter: workshop initiates, customer confirms with OTP → invoice paid, no escrow/commission on cash (note fee later). */
  async cashInit(u: AuthUser, dto: CashInitDto) {
    const inv = await this.payableInvoice(dto.invoice_id);
    if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === inv.orgId && FINANCE.includes(o.role))) throw new AppError('FORBIDDEN');
    const customer = inv.customerUserId ? await this.users.findById(inv.customerUserId) : null; if (!customer?.phone) throw new AppError('VALIDATION', { messageAr: 'لا يوجد جوال للعميل لتأكيد الدفع النقدي.', messageEn: 'Customer has no phone to confirm cash payment.' });
    const code = this.hasher.randomDigits(6);
    await this.otps.create({ phone: customer.phone, purpose: 'payout_confirm', codeHash: this.hasher.sha256(`${customer.phone}:cash:${inv.id}:${code}`), expiresAt: new Date(Date.now() + 300_000) });
    return { invoice_id: inv.id, amount: this.remaining(inv).toString(), sent_to: `${customer.phone.slice(0, 7)}*****`, ...(!this.config.isProd ? { debug_code: code } : {}) };
  }
  async cashConfirm(u: AuthUser, dto: CashConfirmDto) {
    const inv = await this.payableInvoice(dto.invoice_id);
    if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === inv.orgId && FINANCE.includes(o.role))) throw new AppError('FORBIDDEN');
    const customer = inv.customerUserId ? await this.users.findById(inv.customerUserId) : null; if (!customer?.phone) throw new AppError('VALIDATION');
    const ch = await this.otps.findLatestActive(customer.phone, 'payout_confirm', new Date()); if (!ch) throw new AppError('OTP_EXPIRED');
    if (ch.codeHash !== this.hasher.sha256(`${customer.phone}:cash:${inv.id}:${dto.code}`)) { await this.otps.incrementAttempts(ch.id); throw new AppError('OTP_INVALID'); }
    await this.otps.consume(ch.id);
    const amount = this.remaining(inv).toString();
    const p = await this.uow.run(async (tx) => {
      const created = await this.payments.create({ invoiceId: inv.id, workOrderId: inv.workOrderId ?? undefined, payerUserId: inv.customerUserId ?? undefined, payeeOrgId: inv.orgId, method: 'cash', amount, idempotencyKey: `cash:${inv.id}:${ch.id}`, status: 'captured' }, tx);
      await this.payments.update(created.id, { capturedAt: new Date() }, tx);
      await this.markInvoicePaid(tx, inv.id, amount, created.id, 'cash');
      await this.audit.write(tx, { action: 'payment.cash', entityType: 'payment', entityId: created.id, orgId: inv.orgId, actorUserId: u.id, after: { amount, confirmedBy: 'customer_otp' } });
      return created;
    });
    return { payment_id: p.id, amount, method: 'cash', invoice_status: 'paid' };
  }

  async listForInvoice(u: AuthUser, invoiceId: string) { const inv = await this.invoices.findById(invoiceId); if (!inv) throw new AppError('NOT_FOUND'); if (!this.isPayer(inv, u) && !u.orgs.some((o) => o.orgId === inv.orgId) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.payments.listForInvoice(invoiceId); }
  async get(u: AuthUser, id: string) { const p = await this.payments.findById(id); if (!p) throw new AppError('NOT_FOUND'); if (p.payerUserId !== u.id && !u.orgs.some((o) => o.orgId === p.payeeOrgId || o.orgId === p.payerOrgId) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return { ...p, escrow: await this.holds.findByPayment(p.id) }; }
}
