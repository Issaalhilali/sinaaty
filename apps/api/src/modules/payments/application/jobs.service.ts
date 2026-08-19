import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AppConfig } from '../../../config';
import { LeaderLock } from '../../../common/locks';
import { EscrowUseCases } from './use-cases/escrow.use-cases';
import { WalletUseCases } from './use-cases/wallet.use-cases';

/** In-process schedulers (BullMQ workers arrive with Step 10/17). Disabled in tests via JOBS_ENABLED=false. */
@Injectable()
export class PaymentJobs {
  private readonly log = new Logger(PaymentJobs.name);
  constructor(private readonly escrow: EscrowUseCases, private readonly wallet: WalletUseCases, private readonly config: AppConfig, private readonly lock: LeaderLock) {}
  // Runs on one instance only — see LeaderLock.
  @Interval(5 * 60_000) async autoRelease() { if (!this.config.get('JOBS_ENABLED')) return; const r = await this.lock.runExclusive('escrow.auto-release', () => this.escrow.releaseDue()); if (!r) return; if (r.released) this.log.log(`auto-released ${r.released} escrow holds`); }
  @Interval(60 * 60_000) async payouts() { if (!this.config.get('JOBS_ENABLED')) return; const r = await this.lock.runExclusive('payouts.run', () => this.wallet.runPayouts()); if (!r) return; if (r.created.length) this.log.log(`scheduled ${r.created.length} payouts`); }
}
