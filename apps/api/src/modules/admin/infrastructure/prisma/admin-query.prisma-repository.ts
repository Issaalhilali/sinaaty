import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma';
import type { AdminQueryRepository } from '../../domain/repositories';
const d = (v: Prisma.Decimal | number | null | undefined) => (v == null ? '0.00' : new Prisma.Decimal(v).toFixed(2));
@Injectable()
export class AdminQueryPrismaRepository implements AdminQueryRepository {
  constructor(private readonly prisma: PrismaService) {}
  async overview() {
    const p = this.prisma; const now = new Date(); const d30 = new Date(now.getTime() - 30 * 86_400_000); const month = new Date(now.getFullYear(), now.getMonth(), 1); const d1 = new Date(now.getTime() - 86_400_000);
    const [orgs, active, pending, woMonth, woAwaiting, woProg, held, released, fees, imb, notesOpen, notesOverdue, outstanding, openReq, orders30, integ, outboxPending, dlq, approvalSpeed] = await Promise.all([
      p.organization.count(), p.organization.count({ where: { status: 'active' } }), p.organization.count({ where: { status: 'pending_kyb' } }),
      p.workOrder.count({ where: { createdAt: { gte: month } } }), p.workOrder.count({ where: { status: 'awaiting_approval' } }), p.workOrder.count({ where: { status: { in: ['awaiting_parts', 'in_progress', 'quality_check'] } } }),
      p.escrowHold.aggregate({ _sum: { amount: true }, where: { status: { in: ['held', 'frozen'] } } }), p.escrowHold.aggregate({ _sum: { releasedAmount: true }, where: { releasedAt: { gte: d30 } } }), p.escrowHold.aggregate({ _sum: { platformFee: true }, where: { releasedAt: { gte: d30 } } }),
      p.$queryRaw<Array<{ b: Prisma.Decimal | null }>>`SELECT COALESCE(SUM(debit) - SUM(credit), 0) AS b FROM ledger_lines`,
      p.promissoryNote.count({ where: { status: { in: ['issued', 'partially_settled', 'in_enforcement'] } } }), p.promissoryNote.count({ where: { status: { in: ['issued', 'partially_settled', 'in_enforcement'] }, dueDate: { lt: now } } }), p.promissoryNote.aggregate({ _sum: { outstandingAmount: true }, where: { status: { in: ['issued', 'partially_settled', 'in_enforcement'] } } }),
      p.partRequest.count({ where: { status: { in: ['open', 'bidding'] } } }), p.partOrder.count({ where: { createdAt: { gte: d30 } } }),
      p.$queryRaw<Array<{ provider: string; last24h: bigint; succeeded: bigint; failed: bigint; dead_letter: bigint }>>`SELECT provider::text AS provider, COUNT(*) FILTER (WHERE created_at >= ${d1}) AS last24h, COUNT(*) FILTER (WHERE status = 'succeeded' AND created_at >= ${d1}) AS succeeded, COUNT(*) FILTER (WHERE status = 'failed') AS failed, COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter FROM integration_requests GROUP BY provider ORDER BY provider`,
      p.outbox.count({ where: { publishedAt: null } }), p.integrationRequest.count({ where: { status: 'dead_letter' } }),
      p.$queryRaw<Array<{ pct: number | null }>>`SELECT (100.0 * COUNT(*) FILTER (WHERE approved_at - created_at <= interval '1 hour') / NULLIF(COUNT(*), 0))::float AS pct FROM work_orders WHERE approved_at IS NOT NULL AND created_at >= ${d30}`,
    ]);
    return { orgs: { total: orgs, active, pending_kyb: pending }, work_orders: { month: woMonth, awaiting_approval: woAwaiting, in_progress: woProg, approved_within_1h_pct: approvalSpeed[0]?.pct == null ? null : Math.round(approvalSpeed[0].pct * 10) / 10 }, money: { escrow_held: d(held._sum.amount), released_30d: d(released._sum.releasedAmount), platform_fees_30d: d(fees._sum.platformFee), ledger_imbalance: d(imb[0]?.b ?? null) }, notes: { open: notesOpen, overdue: notesOverdue, outstanding: d(outstanding._sum.outstandingAmount) }, parts: { open_requests: openReq, orders_30d: orders30 }, integrations: integ.map((r) => ({ provider: r.provider, last24h: Number(r.last24h), succeeded: Number(r.succeeded), failed: Number(r.failed), dead_letter: Number(r.dead_letter) })), outbox: { pending: outboxPending, dead_letter: dlq } };
  }
  async audit(q: Parameters<AdminQueryRepository['audit']>[0]) { const rows = await this.prisma.auditLog.findMany({ where: { action: q.action ? { contains: q.action } : undefined, entityType: q.entity_type, entityId: q.entity_id, orgId: q.org_id, actorUserId: q.actor_user_id, occurredAt: q.from || q.to ? { gte: q.from, lte: q.to } : undefined, id: q.before_id ? { lt: q.before_id } : undefined }, orderBy: { id: 'desc' }, take: q.limit }); return rows.map((r) => ({ id: r.id.toString(), occurredAt: r.occurredAt, actorUserId: r.actorUserId, actorType: r.actorType, orgId: r.orgId, action: r.action, entityType: r.entityType, entityId: r.entityId, before: r.before, after: r.after, requestId: r.requestId, hash: r.hash, prevHash: r.prevHash })); }
  async settings() { const rows = await this.prisma.platformSetting.findMany({ orderBy: { key: 'asc' } }); return rows.map((r) => ({ key: r.key, value: r.value, updatedBy: r.updatedBy, updatedAt: r.updatedAt })); }
  async setSetting(key: string, value: unknown, updatedBy: string) { await this.prisma.platformSetting.upsert({ where: { key }, update: { value: value as Prisma.InputJsonValue, updatedBy, updatedAt: new Date() }, create: { key, value: value as Prisma.InputJsonValue, updatedBy } }); }
  async integrationRequests(q: { provider?: string; status?: string; limit: number }) { const rows = await this.prisma.integrationRequest.findMany({ where: { provider: q.provider as never, status: q.status as never }, orderBy: { updatedAt: 'desc' }, take: q.limit }); return rows.map((r) => ({ id: r.id, provider: r.provider, operation: r.operation, idempotencyKey: r.idempotencyKey, refTable: r.refTable, refId: r.refId, status: r.status, attempts: r.attempts, nextAttemptAt: r.nextAttemptAt, httpStatus: r.httpStatus, errorMessage: r.errorMessage, latencyMs: r.latencyMs, createdAt: r.createdAt, updatedAt: r.updatedAt })); }
  async webhookEvents(q: { provider?: string; limit: number }) { const rows = await this.prisma.webhookEvent.findMany({ where: { provider: q.provider as never }, orderBy: { receivedAt: 'desc' }, take: q.limit }); return rows.map((r) => ({ id: r.id, provider: r.provider, eventType: r.eventType ?? '', externalEventId: r.providerEventId ?? '', status: r.processingError ? 'failed' : r.processedAt ? 'processed' : 'received', receivedAt: r.receivedAt, processedAt: r.processedAt, errorMessage: r.processingError })); }
  async outboxDeadLetters(limit: number) { const rows = await this.prisma.integrationRequest.findMany({ where: { status: 'dead_letter', idempotencyKey: { startsWith: 'outbox:' } }, orderBy: { updatedAt: 'desc' }, take: limit }); const out = []; for (const r of rows) { const id = Number(r.idempotencyKey.split(':')[1]); const o = Number.isFinite(id) ? await this.prisma.outbox.findUnique({ where: { id: BigInt(id) } }) : null; out.push({ id: r.idempotencyKey, eventType: o?.eventType ?? r.operation, aggregateType: o?.aggregateType ?? '', aggregateId: o?.aggregateId ?? (r.refId ?? ''), attempts: r.attempts, lastError: r.errorMessage, createdAt: r.createdAt }); } return out; }
  async payments(q: { status?: string; limit: number }) { const rows = await this.prisma.payment.findMany({ where: { status: q.status as never }, orderBy: { createdAt: 'desc' }, take: q.limit }); return rows.map((r) => ({ id: r.id, method: r.method, status: r.status, amount: d(r.amount), payeeOrgId: r.payeeOrgId, payerUserId: r.payerUserId, invoiceId: r.invoiceId, workOrderId: r.workOrderId, partOrderId: r.partOrderId, createdAt: r.createdAt })); }
  async escrowHolds(q: { status?: string; limit: number }) { const rows = await this.prisma.escrowHold.findMany({ where: { status: q.status as never }, orderBy: { createdAt: 'desc' }, take: q.limit, include: { beneficiaryOrg: { select: { tradeNameAr: true, legalNameAr: true } } } }); return rows.map((r) => ({ id: r.id, status: r.status, amount: d(r.amount), platformFee: d(r.platformFee), releasedAmount: d(r.releasedAmount), refundedAmount: d(r.refundedAmount), beneficiaryOrgId: r.beneficiaryOrgId, beneficiaryNameAr: r.beneficiaryOrg.tradeNameAr ?? r.beneficiaryOrg.legalNameAr, workOrderId: r.workOrderId, partOrderId: r.partOrderId, autoReleaseAt: r.autoReleaseAt, heldAt: r.heldAt, releasedAt: r.releasedAt })); }
  async payouts(q: { status?: string; limit: number }) { const rows = await this.prisma.payout.findMany({ where: { status: q.status as never }, orderBy: { createdAt: 'desc' }, take: q.limit, include: { org: { select: { tradeNameAr: true, legalNameAr: true } } } }); return rows.map((r) => ({ id: r.id, orgId: r.orgId, orgNameAr: r.org.tradeNameAr ?? r.org.legalNameAr, amount: d(r.amount), status: r.status, scheduledFor: r.scheduledFor, processedAt: r.processedAt, failureReason: r.failureReason })); }
  async users(q: { q?: string; platform_role?: string; limit: number }) { const rows = await this.prisma.user.findMany({ where: { platformRole: q.platform_role as never, OR: q.q ? [{ phoneE164: { contains: q.q } }, { fullNameAr: { contains: q.q } }] : undefined }, orderBy: { createdAt: 'desc' }, take: q.limit }); return rows.map((r) => ({ id: r.id, phone: r.phoneE164, fullNameAr: r.fullNameAr, status: r.status, platformRole: r.platformRole, nafathVerifiedAt: r.nafathVerifiedAt, createdAt: r.createdAt })); }
  async setPlatformRole(userId: string, role: string) { await this.prisma.user.update({ where: { id: userId }, data: { platformRole: role as never } }); }

  async ops(q: { staleMinutes: number; endingMinutes: number; stuckHours: number; limit: number }) {
    const p = this.prisma; const now = new Date();
    const staleBefore = new Date(now.getTime() - q.staleMinutes * 60_000);
    const endingBy = new Date(now.getTime() + q.endingMinutes * 60_000);
    const stuckBefore = new Date(now.getTime() - q.stuckHours * 3_600_000);
    const [repair, partsEnding, unpaid, awaiting, frozen, pastRelease, notes, dlq, stalled, outboxPending, imb] = await Promise.all([
      // طلبات إصلاح مفتوحة بلا أي عرض — عميلٌ ينتظر ولا أحد يرد: أول ما يُتَّصل بشأنه
      p.$queryRaw<Array<{ id: string; number: string; title_ar: string; created_at: Date }>>`
        SELECT r.id, r.number, r.title_ar, r.created_at FROM service_requests r
        WHERE r.status = 'open' AND (r.expires_at IS NULL OR r.expires_at > ${now}) AND r.created_at <= ${staleBefore}
          AND NOT EXISTS (SELECT 1 FROM service_offers o WHERE o.request_id = r.id AND o.status <> 'withdrawn')
        ORDER BY r.created_at ASC LIMIT ${q.limit}`,
      // مزادات قطع على وشك الانتهاء صفراً — تُنقذ بتوسيع أو باتصال بمورّد
      p.$queryRaw<Array<{ id: string; number: string; part_name_ar: string; ends_at: Date }>>`
        SELECT r.id, r.number, r.part_name_ar, r.bidding_ends_at AS ends_at FROM part_requests r
        WHERE r.status IN ('open', 'bidding') AND r.bidding_ends_at BETWEEN ${now} AND ${endingBy}
          AND NOT EXISTS (SELECT 1 FROM part_bids b WHERE b.request_id = r.id AND b.status = 'submitted')
        ORDER BY r.bidding_ends_at ASC LIMIT ${q.limit}`,
      // أوامر شراء معلقة على الدفع طويلاً — بائعٌ حجز بضاعةً لمشترٍ صامت
      p.$queryRaw<Array<{ id: string; number: string; total: Prisma.Decimal; buyer_name_ar: string | null; created_at: Date }>>`
        SELECT o.id, o.number, o.total, COALESCE(b.trade_name_ar, b.legal_name_ar) AS buyer_name_ar, o.created_at
        FROM part_orders o LEFT JOIN organizations b ON b.id = o.buyer_org_id
        WHERE o.status = 'pending_payment' AND o.created_at <= ${stuckBefore}
        ORDER BY o.created_at ASC LIMIT ${q.limit}`,
      // أوامر عمل تنتظر اعتماد العميل طويلاً — الورشة واقفة والعميل غافل: تذكيرٌ يحرّكها
      p.$queryRaw<Array<{ id: string; number: string; title_ar: string | null; org_name_ar: string | null; since: Date }>>`
        SELECT w.id, w.number, w.title_ar, COALESCE(g.trade_name_ar, g.legal_name_ar) AS org_name_ar, w.updated_at AS since
        FROM work_orders w JOIN organizations g ON g.id = w.org_id
        WHERE w.status = 'awaiting_approval' AND w.updated_at <= ${stuckBefore}
        ORDER BY w.updated_at ASC LIMIT ${q.limit}`,
      p.escrowHold.aggregate({ _count: true, _sum: { amount: true }, where: { status: 'frozen' } }),
      // محجوزٌ فات موعدُ تحرره التلقائي ولم يتحرر — الموقِف إما نزاع أو عطل: كلاهما يستحق نظرة
      p.escrowHold.aggregate({ _count: true, _sum: { amount: true }, where: { status: 'held', autoReleaseAt: { lt: now } } }),
      p.promissoryNote.aggregate({ _count: true, _sum: { outstandingAmount: true }, where: { status: { in: ['issued', 'partially_settled', 'in_enforcement'] }, dueDate: { lt: now } } }),
      p.integrationRequest.count({ where: { status: 'dead_letter' } }),
      p.integrationRequest.count({ where: { status: 'failed', attempts: { gte: 3 } } }),
      p.outbox.count({ where: { publishedAt: null } }),
      p.$queryRaw<Array<{ b: Prisma.Decimal | null }>>`SELECT COALESCE(SUM(debit) - SUM(credit), 0) AS b FROM ledger_lines`,
    ]);
    return {
      repair_no_offers: { count: repair.length, rows: repair.map((r) => ({ id: r.id, number: r.number, titleAr: r.title_ar, createdAt: r.created_at })) },
      parts_ending_no_bids: { count: partsEnding.length, rows: partsEnding.map((r) => ({ id: r.id, number: r.number, partNameAr: r.part_name_ar, endsAt: r.ends_at })) },
      part_orders_unpaid: { count: unpaid.length, rows: unpaid.map((r) => ({ id: r.id, number: r.number, total: r.total.toFixed(2), buyerNameAr: r.buyer_name_ar, createdAt: r.created_at })) },
      wo_awaiting_approval: { count: awaiting.length, rows: awaiting.map((r) => ({ id: r.id, number: r.number, titleAr: r.title_ar, orgNameAr: r.org_name_ar, since: r.since })) },
      escrow_frozen: { count: frozen._count, total: d(frozen._sum.amount) },
      escrow_past_release: { count: pastRelease._count, total: d(pastRelease._sum.amount) },
      notes_overdue: { count: notes._count, outstanding: d(notes._sum.outstandingAmount) },
      integrations: { dead_letters: dlq, stalled },
      outbox_pending: outboxPending,
      ledger_imbalance: d(imb[0]?.b ?? null),
    };
  }
}
