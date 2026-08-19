import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff } from '../../identity/domain/auth-user';
import { OutboxProcessor } from '../../integrations/outbox/outbox.processor';
import { ADMIN_QUERY_REPOSITORY, type AdminQueryRepository } from '../domain/repositories';
export const SettingDto = z.object({ value: z.unknown(), reason_ar: z.string().min(3).max(500) }); export type SettingDto = z.infer<typeof SettingDto>;
export const RoleDto = z.object({ platform_role: z.enum(['none', 'support', 'ops', 'finance', 'compliance', 'super_admin']), reason_ar: z.string().min(3).max(500) }); export type RoleDto = z.infer<typeof RoleDto>;
/** Back-office reads + the few writes it owns (settings, platform roles, DLQ retry). Every write needs a reason and lands in audit_log. */
@Injectable()
export class AdminUseCases {
  constructor(@Inject(ADMIN_QUERY_REPOSITORY) private readonly q: AdminQueryRepository, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly auditLog: AuditLogWriter, private readonly outbox: OutboxProcessor) {}
  private staff(u: AuthUser) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
  private superOnly(u: AuthUser) { if (u.platformRole !== 'super_admin') throw new AppError('FORBIDDEN', { messageAr: 'هذا الإجراء لمشرف المنصة فقط.', messageEn: 'Super admin only.' }); }
  overview(u: AuthUser) { this.staff(u); return this.q.overview(); }
  audit(u: AuthUser, q: Parameters<AdminQueryRepository['audit']>[0]) { this.staff(u); return this.q.audit(q); }
  /** CSV export (UTF-8 BOM for Excel), same filters, max 5000 rows. */
  async auditCsv(u: AuthUser, q: Omit<Parameters<AdminQueryRepository['audit']>[0], 'limit'>) { this.staff(u); const rows = await this.q.audit({ ...q, limit: 5000 }); const esc = (v: unknown) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : typeof v === 'string' ? v : JSON.stringify(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; const head = ['id', 'occurred_at', 'actor_user_id', 'actor_type', 'org_id', 'action', 'entity_type', 'entity_id', 'before', 'after', 'request_id', 'hash', 'prev_hash']; return '﻿' + [head.join(','), ...rows.map((r) => [r.id, r.occurredAt.toISOString(), r.actorUserId, r.actorType, r.orgId, r.action, r.entityType, r.entityId, r.before, r.after, r.requestId, r.hash, r.prevHash].map(esc).join(','))].join('\n'); }
  settings(u: AuthUser) { this.staff(u); return this.q.settings(); }
  async setSetting(u: AuthUser, key: string, dto: SettingDto) { this.superOnly(u); if (!/^[a-z0-9_.]{3,80}$/.test(key)) throw new AppError('VALIDATION', { messageEn: 'bad key' }); const before = (await this.q.settings()).find((s) => s.key === key)?.value ?? null; await this.q.setSetting(key, dto.value, u.id); await this.uow.run((tx) => this.auditLog.write(tx, { action: 'platform_setting.update', entityType: 'platform_setting', entityId: null, actorUserId: u.id, actorType: 'admin', before: { key, value: before }, after: { key, value: dto.value, reason: dto.reason_ar } })); return { key, value: dto.value }; }
  integrations(u: AuthUser, q: { provider?: string; status?: string; limit?: number }) { this.staff(u); return Promise.all([this.q.integrationRequests({ provider: q.provider, status: q.status, limit: q.limit ?? 100 }), this.q.webhookEvents({ provider: q.provider, limit: q.limit ?? 100 }), this.q.outboxDeadLetters(100)]).then(([requests, webhooks, dead_letters]) => ({ requests, webhooks, dead_letters })); }
  async retry(u: AuthUser, key: string, reason: string) { this.staff(u); await this.outbox.retry(key); await this.uow.run((tx) => this.auditLog.write(tx, { action: 'integration.retry', entityType: 'integration_request', entityId: null, actorUserId: u.id, actorType: 'admin', after: { key, reason } })); const r = await this.outbox.drain(50); return { retried: key, ...r }; }
  payments(u: AuthUser, q: { status?: string; limit?: number }) { this.staff(u); return this.q.payments({ status: q.status, limit: q.limit ?? 100 }); }
  escrow(u: AuthUser, q: { status?: string; limit?: number }) { this.staff(u); return this.q.escrowHolds({ status: q.status, limit: q.limit ?? 100 }); }
  payouts(u: AuthUser, q: { status?: string; limit?: number }) { this.staff(u); return this.q.payouts({ status: q.status, limit: q.limit ?? 100 }); }
  users(u: AuthUser, q: { q?: string; platform_role?: string; limit?: number }) { this.staff(u); return this.q.users({ q: q.q, platform_role: q.platform_role, limit: q.limit ?? 100 }); }
  async setRole(u: AuthUser, userId: string, dto: RoleDto) { this.superOnly(u); if (userId === u.id) throw new AppError('CONFLICT', { messageAr: 'لا يمكنك تغيير دورك بنفسك.', messageEn: 'Cannot change your own role.' }); await this.q.setPlatformRole(userId, dto.platform_role); await this.uow.run((tx) => this.auditLog.write(tx, { action: 'user.platform_role', entityType: 'user', entityId: userId, actorUserId: u.id, actorType: 'admin', after: { role: dto.platform_role, reason: dto.reason_ar } })); return { user_id: userId, platform_role: dto.platform_role }; }
}
