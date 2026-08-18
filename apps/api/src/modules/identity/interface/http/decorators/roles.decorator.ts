import { SetMetadata } from '@nestjs/common';
import type { OrgMemberRole, PlatformRole } from '@sinaaty/shared-types';

export const ROLES_KEY = 'roles';
export interface RolesSpec {
  /** allowed platform roles (any of) */
  platform?: PlatformRole[];
  /** allowed org roles (any of) — the org id is read from req.params[orgParam ?? 'orgId'] */
  org?: OrgMemberRole[];
  orgParam?: string;
  /** require nafath-verified identity (legal actions) */
  nafath?: boolean;
}
/** Default deny: a route without @Roles only requires a valid token; with @Roles the caller must match. */
export const Roles = (spec: RolesSpec) => SetMetadata(ROLES_KEY, spec);
