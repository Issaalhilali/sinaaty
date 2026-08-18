import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import type { AuthUser } from '../../identity/domain/auth-user';
import { USER_REPOSITORY, type UserRepository } from '../../identity/domain/repositories';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../domain/repositories';
import { WorkOrdersUseCases } from './use-cases/work-orders.use-cases';

/**
 * "Approve without installing the app": SMS carries /v1/approve/<token>. Token = base64url(woId:version:exp) + HMAC.
 * The page shows the signed snapshot; approval completes with an OTP sent to the customer's phone (or Nafath).
 */
@Injectable()
export class ApprovalLinkService {
  constructor(@Inject(WORK_ORDER_REPOSITORY) private readonly repo: WorkOrderRepository, @Inject(USER_REPOSITORY) private readonly users: UserRepository, @Inject(forwardRef(() => WorkOrdersUseCases)) private readonly workOrders: WorkOrdersUseCases, private readonly config: AppConfig) {}
  private secret() { return this.config.get('APPROVAL_LINK_SECRET'); }
  mint(woId: string, version: number, ttlDays = 14): string {
    const body = Buffer.from(`${woId}:${version}:${Date.now() + ttlDays * 86_400_000}`).toString('base64url');
    return `${body}.${createHmac('sha256', this.secret()).update(body).digest('base64url')}`;
  }
  url(woId: string, version: number) { return `${this.config.get('WEB_APPROVAL_BASE_URL')}/v1/approve/${this.mint(woId, version)}`; }
  parse(token: string): { woId: string; version: number } {
    const [body, sig] = token.split('.'); if (!body || !sig) throw new AppError('NOT_FOUND');
    const expected = createHmac('sha256', this.secret()).update(body).digest('base64url');
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new AppError('NOT_FOUND');
    const [woId, v, exp] = Buffer.from(body, 'base64url').toString('utf8').split(':');
    if (!woId || !v || !exp || Number(exp) < Date.now()) throw new AppError('NOT_FOUND', { messageAr: 'انتهت صلاحية الرابط — افتح التطبيق أو اطلب رابطاً جديداً من الورشة.', messageEn: 'This link has expired — open the app or ask the workshop for a new link.' });
    return { woId, version: Number(v) };
  }
  /** Customer identity for the link: acts as the work order's customer (phone-verified via OTP). */
  private async customerOf(woId: string): Promise<AuthUser> {
    const wo = await this.repo.findById(woId); if (!wo?.customerUserId) throw new AppError('NOT_FOUND');
    const u = await this.users.findById(wo.customerUserId); if (!u) throw new AppError('NOT_FOUND');
    return { id: u.id, phone: u.phone, status: u.status, platformRole: u.platformRole, nafathVerified: !!u.nafathVerifiedAt, orgs: u.orgs };
  }
  async view(token: string) {
    const { woId, version } = this.parse(token); const wo = await this.repo.findById(woId); if (!wo) throw new AppError('NOT_FOUND');
    const v = await this.repo.getVersion(woId, version); if (!v) throw new AppError('NOT_FOUND');
    const signed = await this.repo.hasSignature(v.id, 'approve_scope');
    return { work_order_id: woId, number: wo.number, status: wo.status, version, current_version: wo.currentVersion, is_current: version === wo.currentVersion, signed, snapshot: v.snapshot, sha256: v.sha256, phone_masked: (await this.customerOf(woId)).phone?.replace(/^(\+9665\d)\d{5}(\d{2})$/, '$1*****$2') ?? null };
  }
  async sendOtp(token: string) { const { woId } = this.parse(token); const u = await this.customerOf(woId); return this.workOrders.approveInit(u, woId, { method: 'otp' }); }
  async complete(token: string, code: string, ip: string | null) { const { woId, version } = this.parse(token); const u = await this.customerOf(woId); return this.workOrders.approveComplete(u, woId, { method: 'otp', code, version }, { ip, deviceId: null }); }
  async decline(token: string, reason: string) { const { woId } = this.parse(token); const u = await this.customerOf(woId); return this.workOrders.cancel(u, woId, { reason_ar: reason }); }
}
