import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { SUPPLIER_ORG_TYPES } from '../domain/parts';
import { PARTS_REPOSITORY, type PartsRepository } from '../domain/repositories';
import type { TradeAccountApproveDto, TradeAccountRequestDto } from './dto/parts.dto';

/** Nafez-secured trade account (supplier ↔ workshop): request → supplier approves (limit/terms) → every deferred order = promissory note. */
@Injectable()
export class TradeAccountsUseCases {
  constructor(@Inject(PARTS_REPOSITORY) private readonly repo: PartsRepository, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter) {}
  private role(u: AuthUser, orgId: string) { const m = membership(u, orgId); if (!m && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return m; }
  /** Buyer (workshop owner/finance) requests an account with a supplier. */
  async request(u: AuthUser, dto: TradeAccountRequestDto) {
    this.role(u, dto.buyer_org_id); const seller = await this.orgs.findById(dto.seller_org_id); if (!seller || !(SUPPLIER_ORG_TYPES as readonly string[]).includes(seller.type)) throw new AppError('NOT_FOUND');
    const existing = await this.repo.findTradeAccountPair(dto.seller_org_id, dto.buyer_org_id); if (existing) return existing;
    return this.uow.run(async (tx) => { const a = await this.repo.createTradeAccount({ sellerOrgId: dto.seller_org_id, buyerOrgId: dto.buyer_org_id }, tx); await this.audit.write(tx, { action: 'trade_account.request', entityType: 'trade_account', entityId: a.id, orgId: dto.buyer_org_id, actorUserId: u.id }); await this.outbox.publish(tx, { eventType: 'TradeAccountRequested', aggregateType: 'trade_account', aggregateId: a.id, payload: { sellerOrgId: a.sellerOrgId, buyerOrgId: a.buyerOrgId } }); return a; });
  }
  /** Supplier approves: sets credit limit + terms → active. (Buyer's Nafath-signed agreement lands with the live Nafath contract — tracked in docs/backlog.md.) */
  async approve(u: AuthUser, id: string, dto: TradeAccountApproveDto) {
    const a = await this.repo.findTradeAccount(id); if (!a) throw new AppError('NOT_FOUND'); this.role(u, a.sellerOrgId);
    if (!['pending', 'on_hold'].includes(a.status)) throw new AppError('CONFLICT', { messageEn: `account is ${a.status}` });
    await this.uow.run(async (tx) => { await this.repo.updateTradeAccount(id, { status: 'active', creditLimit: dto.credit_limit, paymentTermsDays: dto.payment_terms_days, discountBps: dto.discount_bps, approvedBy: u.id, approvedAt: new Date() }, tx); await this.audit.write(tx, { action: 'trade_account.approve', entityType: 'trade_account', entityId: id, orgId: a.sellerOrgId, actorUserId: u.id, after: { credit_limit: dto.credit_limit, terms_days: dto.payment_terms_days } }); await this.outbox.publish(tx, { eventType: 'TradeAccountApproved', aggregateType: 'trade_account', aggregateId: id, payload: { sellerOrgId: a.sellerOrgId, buyerOrgId: a.buyerOrgId, creditLimit: dto.credit_limit, termsDays: dto.payment_terms_days } }); });
    return this.repo.findTradeAccount(id);
  }
  async hold(u: AuthUser, id: string, hold: boolean) { const a = await this.repo.findTradeAccount(id); if (!a) throw new AppError('NOT_FOUND'); this.role(u, a.sellerOrgId); await this.uow.run(async (tx) => { await this.repo.updateTradeAccount(id, { status: hold ? 'on_hold' : 'active' }, tx); await this.audit.write(tx, { action: hold ? 'trade_account.hold' : 'trade_account.reactivate', entityType: 'trade_account', entityId: id, orgId: a.sellerOrgId, actorUserId: u.id }); }); return this.repo.findTradeAccount(id); }
  async list(u: AuthUser, q: { org_id: string; as: 'seller' | 'buyer' }) { this.role(u, q.org_id); const rows = await this.repo.listTradeAccounts(q.as === 'seller' ? { sellerOrgId: q.org_id, limit: 200 } : { buyerOrgId: q.org_id, limit: 200 }); const out = []; for (const a of rows) { const other = await this.orgs.findById(q.as === 'seller' ? a.buyerOrgId : a.sellerOrgId); out.push({ ...a, available: (Number(a.creditLimit) - Number(a.outstanding)).toFixed(2), counterparty_ar: other?.tradeNameAr ?? other?.legalNameAr ?? null }); } return out; }
  async get(u: AuthUser, id: string) { const a = await this.repo.findTradeAccount(id); if (!a) throw new AppError('NOT_FOUND'); if (!membership(u, a.sellerOrgId) && !membership(u, a.buyerOrgId) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return { ...a, available: (Number(a.creditLimit) - Number(a.outstanding)).toFixed(2), orders: await this.repo.listOrders({ tradeAccountId: id, limit: 100 }) }; }
}
