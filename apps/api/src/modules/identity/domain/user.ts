import type { PlatformRole, UserStatus } from '@sinaaty/shared-types';
import type { OrgMembership } from './auth-user';

/** Domain view of a user needed by identity use cases (not the full DB row). */
export interface User {
  id: string;
  phone: string | null;
  fullNameAr: string | null;
  email: string | null;
  status: UserStatus;
  platformRole: PlatformRole;
  nafathVerifiedAt: Date | null;
  orgs: OrgMembership[];
}
