import type { PlatformRole, OrgMemberRole, UserStatus } from '@sinaaty/shared-types';

/** What every authenticated request knows about the caller (from the access token). */
export interface OrgMembership {
  orgId: string;
  role: OrgMemberRole;
}
export interface AuthUser {
  id: string;
  phone: string | null;
  status: UserStatus;
  platformRole: PlatformRole;
  nafathVerified: boolean;
  orgs: OrgMembership[];
  deviceId?: string;
}

export const PLATFORM_STAFF: PlatformRole[] = ['support', 'ops', 'finance', 'compliance', 'super_admin'];
export const isPlatformStaff = (u: AuthUser): boolean => PLATFORM_STAFF.includes(u.platformRole);
export const membership = (u: AuthUser, orgId: string): OrgMembership | undefined => u.orgs.find((m) => m.orgId === orgId);
