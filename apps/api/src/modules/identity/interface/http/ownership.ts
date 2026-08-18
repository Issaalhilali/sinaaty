import type { OrgMemberRole } from '@sinaaty/shared-types';
import { AppError } from '../../../../common/errors';
import { type AuthUser, isPlatformStaff, membership } from '../../domain/auth-user';

/**
 * Resource ownership check used inside controllers/use cases: the caller must be the owning user,
 * a member (with one of `orgRoles`, or any role) of the owning org, or platform staff.
 */
export function assertOwnership(user: AuthUser, owner: { userId?: string | null; orgId?: string | null; orgRoles?: OrgMemberRole[] }): void {
  if (isPlatformStaff(user)) return;
  if (owner.userId && owner.userId === user.id) return;
  if (owner.orgId) {
    const m = membership(user, owner.orgId);
    if (m && (!owner.orgRoles || owner.orgRoles.includes(m.role))) return;
  }
  throw new AppError('FORBIDDEN');
}
