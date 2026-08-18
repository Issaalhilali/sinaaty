import type { OrgMemberRole, OrgStatus, OrgType } from '@sinaaty/shared-types';

export interface Organization {
  id: string; type: OrgType; status: OrgStatus;
  legalNameAr: string; legalNameEn: string | null; tradeNameAr: string | null; slug: string | null;
  crNumber: string | null; vatNumber: string | null; vatRegistered: boolean;
  phone: string | null; email: string | null; descriptionAr: string | null;
  ratingAvg: string; ratingCount: number; commissionRateBps: number; verifiedAt: Date | null; createdBy: string | null; createdAt: Date;
}

/** Org status state machine — the ONLY allowed transitions (CLAUDE.md §5.2). */
export const ORG_TRANSITIONS: Record<OrgStatus, OrgStatus[]> = {
  draft: ['pending_kyb', 'closed'],
  pending_kyb: ['active', 'draft', 'closed'], // active = approved; draft = rejected (fix docs & resubmit)
  active: ['suspended', 'closed'],
  suspended: ['active', 'closed'],
  closed: [],
};
export function canTransition(from: OrgStatus, to: OrgStatus): boolean { return ORG_TRANSITIONS[from].includes(to); }

/** Which member roles may manage what inside an org. */
export const ORG_MANAGERS: OrgMemberRole[] = ['owner', 'manager'];
export const ORG_FINANCE: OrgMemberRole[] = ['owner', 'accountant'];
export const ROLES_BY_ORG_TYPE: Record<OrgType, OrgMemberRole[]> = {
  workshop: ['owner', 'manager', 'technician', 'accountant'], factory: ['owner', 'manager', 'technician', 'accountant'], service_center: ['owner', 'manager', 'technician', 'accountant'], body_shop: ['owner', 'manager', 'technician', 'accountant'],
  parts_dealer: ['owner', 'manager', 'accountant'], parts_distributor: ['owner', 'manager', 'accountant'], parts_brand_agent: ['owner', 'manager', 'accountant'], scrapyard: ['owner', 'manager', 'accountant'],
  fleet_company: ['owner', 'fleet_admin', 'fleet_approver', 'fleet_viewer', 'accountant'], logistics: ['owner', 'manager', 'driver', 'accountant'], inspection_center: ['owner', 'manager', 'technician', 'accountant'],
};
export const KYB_REQUIRED_DOCS = ['commercial_registration', 'owner_id'] as const;
export const isValidSaudiIban = (iban: string) => /^SA\d{2}[0-9A-Z]{20}$/i.test(iban.replace(/\s+/g, ''));
export const isValidVat = (vat: string) => /^3\d{13}3$/.test(vat);
export const isValidCr = (cr: string) => /^\d{10}$/.test(cr);
