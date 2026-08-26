import type { KybDocStatus, KybDocType, OrgMemberRole, OrgStatus, OrgType } from '@sinaaty/shared-types';
import type { Organization } from './organization';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';

export interface OrgMember { userId: string; role: OrgMemberRole; isActive: boolean; joinedAt: Date; phone: string | null; fullNameAr: string | null }
export interface OrgLocation { id: string; nameAr: string | null; isPrimary: boolean; city: string; district: string | null; industrialZone: string | null; addressLine: string | null; lat: number; lng: number; serviceRadiusKm: number }
export interface KybDoc { id: string; type: KybDocType; mediaId: string; status: KybDocStatus; rejectionReason: string | null; createdAt: Date }
export interface OrgSearchHit { id: string; type: OrgType; tradeNameAr: string | null; legalNameAr: string; ratingAvg: string; ratingCount: number; city: string | null; distanceKm: number | null; lat: number | null; lng: number | null; /** تخصّصها يشمل صنع سيارة الباحث — الترتيب يقدّمها. */ specialised: boolean }

export interface OrganizationRepository {
  create(input: { type: OrgType; legalNameAr: string; legalNameEn?: string; tradeNameAr?: string; slug?: string; crNumber?: string; vatNumber?: string; phone?: string; email?: string; descriptionAr?: string; createdBy: string }): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findByCr(cr: string): Promise<Organization | null>;
  update(id: string, patch: Partial<Pick<Organization, 'legalNameAr' | 'legalNameEn' | 'tradeNameAr' | 'phone' | 'email' | 'descriptionAr' | 'vatNumber' | 'vatRegistered'>>): Promise<Organization>;
  setStatus(id: string, status: OrgStatus, extra?: { verifiedAt?: Date | null }, tx?: TxHandle): Promise<Organization>;
  setCommission(id: string, bps: number): Promise<void>;
  search(q: { type?: OrgType; city?: string; lat?: number; lng?: number; radiusKm?: number; text?: string; ids?: string[]; makeId?: number; limit: number }): Promise<OrgSearchHit[]>;
  listForAdmin(q: { status?: OrgStatus; type?: OrgType; limit: number }): Promise<Organization[]>;
  listByIds(ids: string[]): Promise<Organization[]>;
  // members
  listMembers(orgId: string): Promise<OrgMember[]>;
  upsertMember(orgId: string, userId: string, role: OrgMemberRole, invitedBy: string): Promise<void>;
  removeMember(orgId: string, userId: string): Promise<boolean>;
  countOwners(orgId: string): Promise<number>;
  // locations / specialties
  addLocation(orgId: string, l: { nameAr?: string; isPrimary?: boolean; city: string; district?: string; industrialZone?: string; addressLine?: string; lat: number; lng: number; serviceRadiusKm?: number }): Promise<OrgLocation>;
  listLocations(orgId: string): Promise<OrgLocation[]>;
  setSpecialties(orgId: string, items: Array<{ makeId?: number; categoryId?: number }>): Promise<void>;
  // kyb
  addKybDoc(orgId: string, type: KybDocType, mediaId: string, expiresAt?: Date): Promise<KybDoc>;
  listKybDocs(orgId: string): Promise<KybDoc[]>;
  reviewKybDocs(orgId: string, status: KybDocStatus, reviewedBy: string, reason?: string): Promise<void>;
  // bank
  addBankAccount(orgId: string, b: { bankName: string; ibanEnc: Buffer; ibanLast4: string; holderName: string }): Promise<{ id: string }>;
  listBankAccounts(orgId: string): Promise<Array<{ id: string; bankName: string; ibanLast4: string; holderName: string; isDefault: boolean; verifiedAt: Date | null }>>;
}
export interface SubscriptionRepository {
  listPlans(orgType?: OrgType): Promise<Array<{ id: string; code: string; nameAr: string; nameEn: string; appliesTo: OrgType[]; monthlyPrice: string; yearlyPrice: string | null; commissionRateBps: number; noteFeeSar: string; features: unknown }>>;
  findPlanByCode(code: string): Promise<{ id: string; code: string; appliesTo: OrgType[]; commissionRateBps: number } | null>;
  current(orgId: string): Promise<{ id: string; planCode: string; status: string; currentPeriodEnd: Date } | null>;
  subscribe(orgId: string, planId: string, cycle: 'monthly' | 'yearly'): Promise<{ id: string }>;
}
export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');
export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
