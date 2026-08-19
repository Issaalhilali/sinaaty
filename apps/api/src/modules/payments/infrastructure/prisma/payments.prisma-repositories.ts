import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { LedgerEntryDraft } from '@sinaaty/ledger';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import { redactPii } from '../../../../common/crypto/redaction';
import type { EscrowHold, Payment, Payout } from '../../domain/payment';
import type { EscrowRepository, LedgerRepository, PaymentRepository, PayoutRepository, WebhookInbox } from '../../domain/repositories';

const d = (v: Prisma.Decimal | null | undefined) => (v == null ? '0.00' : v.toFixed(2));
const D = (v: string) => new Prisma.Decimal(v);
type PayRow = Prisma.PaymentGetPayload<Record<string, never>>;
const toPayment = (r: PayRow): Payment => ({ id: r.id, invoiceId: r.invoiceId, workOrderId: r.workOrderId, partOrderId: r.partOrderId, payerUserId: r.payerUserId, payerOrgId: r.payerOrgId, payeeOrgId: r.payeeOrgId, method: r.method, status: r.status, amount: d(r.amount), currency: r.currency, pspProvider: r.pspProvider, pspIntentId: r.pspIntentId, pspChargeId: r.pspChargeId, idempotencyKey: r.idempotencyKey, failureReason: r.failureReason, authorizedAt: r.authorizedAt, capturedAt: r.capturedAt, refundedAmount: d(r.refundedAmount), createdAt: r.createdAt });
type HoldRow = Prisma.EscrowHoldGetPayload<Record<string, never>>;
const toHold = (r: HoldRow): EscrowHold => ({ id: r.id, paymentId: r.paymentId, beneficiaryOrgId: r.beneficiaryOrgId, workOrderId: r.workOrderId, partOrderId: r.partOrderId, amount: d(r.amount), platformFee: d(r.platformFee), status: r.status, autoReleaseAt: r.autoReleaseAt, releasedAmount: d(r.releasedAmount), refundedAmount: d(r.refundedAmount), releaseReason: r.releaseReason, disputeId: r.disputeId, heldAt: r.heldAt, releasedAt: r.releasedAt, createdAt: r.createdAt });
type PayoutRow = Prisma.PayoutGetPayload<Record<string, never>>;
const toPayout = (r: PayoutRow): Payout => ({ id: r.id, orgId: r.orgId, bankAccountId: r.bankAccountId, amount: d(r.amount), status: r.status, providerRef: r.providerRef, scheduledFor: r.scheduledFor, processedAt: r.processedAt, failureReason: r.failureReason, createdAt: r.createdAt });

@Injectable()
export class PaymentPrismaRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async create(p: Parameters<PaymentRepository['create']>[0], tx?: TxHandle) { const r = await this.db(tx).payment.create({ data: { invoiceId: p.invoiceId, workOrderId: p.workOrderId, partOrderId: p.partOrderId, payerUserId: p.payerUserId, payerOrgId: p.payerOrgId, payeeOrgId: p.payeeOrgId, method: p.method, amount: D(p.amount), pspProvider: p.pspProvider, pspIntentId: p.pspIntentId, idempotencyKey: p.idempotencyKey, status: p.status ?? 'initiated' } }); return toPayment(r); }
  async findById(id: string) { const r = await this.prisma.payment.findUnique({ where: { id } }); return r ? toPayment(r) : null; }
  async findByIntent(provider: string, intentId: string) { const r = await this.prisma.payment.findFirst({ where: { pspProvider: provider, pspIntentId: intentId } }); return r ? toPayment(r) : null; }
  async findPendingForInvoice(invoiceId: string) { const r = await this.prisma.payment.findFirst({ where: { invoiceId, status: { in: ['initiated', 'pending', 'authorized'] }, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } } }); return r ? toPayment(r) : null; }
  async listForInvoice(invoiceId: string) { const rows = await this.prisma.payment.findMany({ where: { invoiceId }, orderBy: { createdAt: 'desc' } }); return rows.map(toPayment); }
  async update(id: string, p: Parameters<PaymentRepository['update']>[1], tx?: TxHandle) { await this.db(tx).payment.update({ where: { id }, data: { status: p.status, pspChargeId: p.pspChargeId, failureReason: p.failureReason, authorizedAt: p.authorizedAt, capturedAt: p.capturedAt, refundedAmount: p.refundedAmount ? D(p.refundedAmount) : undefined, pspPayload: p.pspPayload === undefined ? undefined : (redactPii(p.pspPayload) as Prisma.InputJsonValue) } }); }
}
@Injectable()
export class EscrowPrismaRepository implements EscrowRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async create(h: Parameters<EscrowRepository['create']>[0], tx?: TxHandle) { const r = await this.db(tx).escrowHold.create({ data: { paymentId: h.paymentId, beneficiaryOrgId: h.beneficiaryOrgId, workOrderId: h.workOrderId ?? undefined, partOrderId: h.partOrderId ?? undefined, amount: D(h.amount), autoReleaseAt: h.autoReleaseAt, status: h.status, heldAt: h.heldAt, escrowProviderRef: h.providerRef } }); return toHold(r); }
  async findById(id: string, tx?: TxHandle) { const r = await this.db(tx).escrowHold.findUnique({ where: { id } }); return r ? toHold(r) : null; }
  async findByPayment(paymentId: string) { const r = await this.prisma.escrowHold.findFirst({ where: { paymentId } }); return r ? toHold(r) : null; }
  async listByWorkOrder(workOrderId: string) { const rows = await this.prisma.escrowHold.findMany({ where: { workOrderId }, orderBy: { createdAt: 'asc' } }); return rows.map(toHold); }
  async listByPartOrder(partOrderId: string) { const rows = await this.prisma.escrowHold.findMany({ where: { partOrderId }, orderBy: { createdAt: 'asc' } }); return rows.map(toHold); }
  async listDue(now: Date, limit: number) { const rows = await this.prisma.escrowHold.findMany({ where: { status: 'held', autoReleaseAt: { lte: now } }, orderBy: { autoReleaseAt: 'asc' }, take: limit }); return rows.map(toHold); }
  async listReleasedUnpaid(orgId?: string) { const rows = await this.prisma.escrowHold.findMany({ where: { status: 'released', beneficiaryOrgId: orgId, payoutItems: { none: {} } }, orderBy: { releasedAt: 'asc' } }); return rows.map(toHold); }
  async update(id: string, p: Parameters<EscrowRepository['update']>[1], tx?: TxHandle) { await this.db(tx).escrowHold.update({ where: { id }, data: { status: p.status, platformFee: p.platformFee ? D(p.platformFee) : undefined, releasedAmount: p.releasedAmount ? D(p.releasedAmount) : undefined, refundedAmount: p.refundedAmount ? D(p.refundedAmount) : undefined, releaseReason: p.releaseReason, disputeId: p.disputeId, releasedAt: p.releasedAt } }); }
}
@Injectable()
export class LedgerPrismaRepository implements LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  /** Posts a balanced entry; the DB constraint trigger re-checks balance at commit. Idempotent by key. */
  async post(entry: LedgerEntryDraft, tx?: TxHandle) {
    const db = this.db(tx);
    const existing = await db.ledgerEntry.findUnique({ where: { idempotencyKey: entry.idempotencyKey }, select: { id: true } });
    if (existing) return { entryId: existing.id, duplicate: true };
    const accountIds = new Map<string, string>();
    for (const l of entry.lines) {
      if (accountIds.has(l.account.code)) continue;
      const a = await db.ledgerAccount.upsert({ where: { code: l.account.code }, update: {}, create: { code: l.account.code, type: l.account.type, orgId: l.account.orgId ?? null }, select: { id: true } });
      accountIds.set(l.account.code, a.id);
    }
    const e = await db.ledgerEntry.create({ data: { entryType: entry.entryType, refTable: entry.refTable, refId: entry.refId, description: entry.description, idempotencyKey: entry.idempotencyKey, ledgerLines: { create: entry.lines.map((l) => ({ accountId: accountIds.get(l.account.code)!, debit: D(l.debit.toFixed(2)), credit: D(l.credit.toFixed(2)) })) } }, select: { id: true } });
    return { entryId: e.id, duplicate: false };
  }
  async balance(code: string) { const r = await this.prisma.$queryRaw<Array<{ b: Prisma.Decimal | null }>>`SELECT COALESCE(SUM(l.debit) - SUM(l.credit), 0) AS b FROM ledger_lines l JOIN ledger_accounts a ON a.id = l.account_id WHERE a.code = ${code}`; return d(r[0]?.b ?? null); }
  async balances(codes: string[]) { const rows = await this.prisma.$queryRaw<Array<{ code: string; b: Prisma.Decimal }>>`SELECT a.code, COALESCE(SUM(l.debit) - SUM(l.credit), 0) AS b FROM ledger_accounts a LEFT JOIN ledger_lines l ON l.account_id = a.id WHERE a.code IN (${Prisma.join(codes)}) GROUP BY a.code`; return Object.fromEntries(codes.map((c) => [c, d(rows.find((r) => r.code === c)?.b ?? null)])); }
  async entriesForOrg(orgId: string, limit: number) {
    const rows = await this.prisma.ledgerEntry.findMany({ where: { ledgerLines: { some: { account: { orgId } } } }, orderBy: { postedAt: 'desc' }, take: limit, include: { ledgerLines: { include: { account: { select: { code: true } } } } } });
    return rows.map((e) => ({ id: e.id, entryType: e.entryType, refTable: e.refTable, refId: e.refId, description: e.description, postedAt: e.postedAt, lines: e.ledgerLines.map((l) => ({ account: l.account.code, debit: d(l.debit), credit: d(l.credit) })) }));
  }
  async globalImbalance() { const r = await this.prisma.$queryRaw<Array<{ b: Prisma.Decimal | null }>>`SELECT COALESCE(SUM(debit) - SUM(credit), 0) AS b FROM ledger_lines`; return d(r[0]?.b ?? null); }
}
@Injectable()
export class PayoutPrismaRepository implements PayoutRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async create(p: Parameters<PayoutRepository['create']>[0], tx?: TxHandle) { const r = await this.db(tx).payout.create({ data: { orgId: p.orgId, bankAccountId: p.bankAccountId, amount: D(p.amount), scheduledFor: p.scheduledFor, payoutItems: { create: p.holdIds.map((h) => ({ escrowHoldId: h.holdId, amount: D(h.amount) })) } } }); return toPayout(r); }
  async findById(id: string) { const r = await this.prisma.payout.findUnique({ where: { id } }); return r ? toPayout(r) : null; }
  async listForOrg(orgId: string, limit: number) { const rows = await this.prisma.payout.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' }, take: limit }); return rows.map(toPayout); }
  async listScheduled(limit: number) { const rows = await this.prisma.payout.findMany({ where: { status: 'scheduled' }, orderBy: { scheduledFor: 'asc' }, take: limit }); return rows.map(toPayout); }
  async update(id: string, p: Parameters<PayoutRepository['update']>[1], tx?: TxHandle) { await this.db(tx).payout.update({ where: { id }, data: { status: p.status, providerRef: p.providerRef, processedAt: p.processedAt, failureReason: p.failureReason, ledgerEntryId: p.ledgerEntryId } }); }
  async defaultBankAccountId(orgId: string) { const b = await this.prisma.organizationBankAccount.findFirst({ where: { orgId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }], select: { id: true } }); return b?.id ?? null; }
}
@Injectable()
export class WebhookInboxPrisma implements WebhookInbox {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async record(e: Parameters<WebhookInbox['record']>[0], tx?: TxHandle) {
    try { await this.db(tx).webhookEvent.create({ data: { provider: e.provider as never, providerEventId: e.providerEventId, eventType: e.eventType, signatureValid: e.signatureValid, headers: (e.headers ?? undefined), payload: redactPii(e.payload) as Prisma.InputJsonValue } }); return { inserted: true }; }
    catch (err) { if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { inserted: false }; throw err; }
  }
  async markProcessed(provider: string, providerEventId: string, error?: string, tx?: TxHandle) { await this.db(tx).webhookEvent.update({ where: { provider_providerEventId: { provider: provider as never, providerEventId } }, data: { processedAt: new Date(), processingError: error } }); }
}
