import { Inject, Injectable } from '@nestjs/common';
import { Accounts, payoutSent } from '@sinaaty/ledger';
import { AppError } from '../../../../common/errors';
import { Money } from '../../../../common/domain/money';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import { AuditLogWriter } from '../../../../common/audit';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { isPlatformStaff } from '../../../identity/domain/auth-user';
import { ESCROW_REPOSITORY, type EscrowRepository, LEDGER_REPOSITORY, type LedgerRepository, PAYOUT_REPOSITORY, type PayoutRepository } from '../../domain/repositories';
import { PSP_PORT, type PspPort } from '../ports/psp.port';

const FINANCE = ['owner', 'accountant', 'manager'];

@Injectable()
export class WalletUseCases {
  constructor(@Inject(LEDGER_REPOSITORY) private readonly ledger: LedgerRepository, @Inject(ESCROW_REPOSITORY) private readonly holds: EscrowRepository, @Inject(PAYOUT_REPOSITORY) private readonly payouts: PayoutRepository, @Inject(PSP_PORT) private readonly psp: PspPort, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter) {}
  private mustFinance(orgId: string, u: AuthUser) { if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === orgId && FINANCE.includes(o.role))) throw new AppError('FORBIDDEN'); }

  /** Org wallet: held (escrow liability), available (org_available balance), scheduled payouts, recent ledger. */
  async wallet(u: AuthUser, orgId: string) {
    this.mustFinance(orgId, u);
    const codes = [Accounts.escrowLiability(orgId).code, Accounts.orgAvailable(orgId).code];
    const b = await this.ledger.balances(codes);
    // liabilities carry credit balances → negate debit_balance for display
    const held = Money.of(b[codes[0]!] ?? '0').times(-1); const available = Money.of(b[codes[1]!] ?? '0').times(-1);
    const payouts = await this.payouts.listForOrg(orgId, 20);
    const scheduled = Money.sum(payouts.filter((p) => ['scheduled', 'processing'].includes(p.status)).map((p) => Money.of(p.amount)));
    return { org_id: orgId, currency: 'SAR', held: held.toString(), available: available.toString(), payouts_in_transit: scheduled.toString(), payouts, recent_entries: await this.ledger.entriesForOrg(orgId, 30) };
  }
  /** Scheduler: bundle every released-but-unpaid hold per org into one payout (needs a default bank account). */
  async runPayouts(orgId?: string) {
    const holds = await this.holds.listReleasedUnpaid(orgId); const byOrg = new Map<string, typeof holds>();
    for (const h of holds) byOrg.set(h.beneficiaryOrgId, [...(byOrg.get(h.beneficiaryOrgId) ?? []), h]);
    const created: Array<{ payout_id: string; org_id: string; amount: string; holds: number }> = []; const skipped: string[] = [];
    for (const [org, hs] of byOrg) {
      const bank = await this.payouts.defaultBankAccountId(org); if (!bank) { skipped.push(org); continue; }
      const amount = Money.sum(hs.map((h) => Money.of(h.releasedAmount)));
      if (amount.isZero()) continue;
      const p = await this.uow.run((tx) => this.payouts.create({ orgId: org, bankAccountId: bank, amount: amount.toString(), scheduledFor: new Date(), holdIds: hs.map((h) => ({ holdId: h.id, amount: h.releasedAmount })) }, tx));
      created.push({ payout_id: p.id, org_id: org, amount: amount.toString(), holds: hs.length });
    }
    return { created, skipped_no_bank_account: skipped };
  }
  /** Execute a scheduled payout via PSP/bank and post org_available → bank. */
  async executePayout(payoutId: string, actorUserId: string | null) {
    const p = await this.payouts.findById(payoutId); if (!p) throw new AppError('NOT_FOUND');
    if (p.status !== 'scheduled') throw new AppError('CONFLICT', { messageEn: `payout is ${p.status}` });
    const r = await this.psp.payout({ payoutId: p.id, ibanLast4: '****', amount: p.amount });
    await this.uow.run(async (tx) => {
      const e = await this.ledger.post(payoutSent({ payoutId: p.id, orgId: p.orgId, amount: p.amount }), tx);
      await this.payouts.update(p.id, { status: r.status === 'paid' ? 'paid' : 'processing', providerRef: r.providerRef, processedAt: new Date(), ledgerEntryId: e.entryId }, tx);
      await this.audit.write(tx, { action: 'payout.execute', entityType: 'payout', entityId: p.id, orgId: p.orgId, actorUserId, actorType: actorUserId ? 'admin' : 'system', after: { amount: p.amount, providerRef: r.providerRef } });
    });
    return this.payouts.findById(p.id);
  }
  async adminRunPayouts(u: AuthUser, orgId?: string) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.runPayouts(orgId); }
  async adminExecute(u: AuthUser, payoutId: string) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.executePayout(payoutId, u.id); }
  async ledgerHealth(u: AuthUser) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); const imbalance = await this.ledger.globalImbalance(); return { balanced: imbalance === '0.00', imbalance }; }
}
