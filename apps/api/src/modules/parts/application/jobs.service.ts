import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AppConfig } from '../../../config';
import { LeaderLock } from '../../../common/locks';
import { MarketplaceUseCases } from './marketplace.use-cases';
import { OrdersUseCases } from './orders.use-cases';
/** In-process schedulers (BullMQ later): bidding-window expiry, part-order auto-confirm. */
@Injectable()
export class PartsJobs {
  private readonly log = new Logger('PartsJobs');
  constructor(private readonly config: AppConfig, private readonly market: MarketplaceUseCases, private readonly orders: OrdersUseCases, private readonly lock: LeaderLock) {}
  @Interval(60_000) async tick() { if (!this.config.get('JOBS_ENABLED')) return; const res = await this.lock.runExclusive('parts.jobs', async () => ({ e: await this.market.expireDue(), c: await this.orders.autoConfirmDue() })); if (!res) return; const { e, c } = res; if (e.expired || c.confirmed) this.log.log(`expired ${e.expired} requests, auto-confirmed ${c.confirmed} orders`); }
}
