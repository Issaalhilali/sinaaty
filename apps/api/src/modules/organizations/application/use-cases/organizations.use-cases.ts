import { Inject, Injectable, Optional } from '@nestjs/common';
import type { KybDocStatus, KybDocType, OrgMemberRole, OrgStatus, OrgType } from '@sinaaty/shared-types';
import { PilotService } from '../../../pilot/application/pilot.service';
import { SEARCH_PORT, type SearchPort } from '../../../search/application/ports/search.port';
import { AppError } from '../../../../common/errors';
import { PiiCryptoService } from '../../../../common/crypto';
import { AuditLogWriter } from '../../../../common/audit';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import { normalizeSaudiPhone } from '../../../identity/domain/otp';
import { USER_REPOSITORY, type UserRepository } from '../../../identity/domain/repositories';
import { isValidSaudiIban, KYB_REQUIRED_DOCS, ROLES_BY_ORG_TYPE } from '../../domain/organization';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository, SUBSCRIPTION_REPOSITORY, type SubscriptionRepository } from '../../domain/repositories';
import { OrgTransitionService } from '../org-transition.service';
import type { AddBankAccountDto, AddKybDocDto, AddLocationDto, AddMemberDto, CreateOrgDto, SearchOrgsDto, SetSpecialtiesDto, SubscribeDto, UpdateOrgDto } from '../dto/organizations.dto';

type Actor = { userId: string; requestId?: string | null };

@Injectable()
export class OrganizationsUseCases {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subs: SubscriptionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly transitions: OrgTransitionService,
    private readonly pii: PiiCryptoService,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
    // Optional: organizations exist without the pilot module (tests, future deployments without zones).
    @Optional() private readonly pilot?: PilotService,
    @Optional() @Inject(SEARCH_PORT) private readonly searchPort?: SearchPort,
  ) {}

  // ---- public / discovery ----
  /** Discovery. Typed text goes through the search port (typo-tolerant Arabic) and the hits are hydrated
   *  from the database; anything else — and any search failure — is answered by SQL+PostGIS directly.
   *  Finding a workshop slightly worse always beats finding nothing. */
  async search(q: SearchOrgsDto) {
    const sql = () => this.orgs.search({ type: q.type as OrgType | undefined, city: q.city, lat: q.lat, lng: q.lng, radiusKm: q.radius_km, text: q.q, limit: q.limit });
    if (!q.q?.trim() || !this.searchPort) return sql();
    try {
      const hits = await this.searchPort.searchOrgs({ text: q.q.trim(), type: q.type, city: q.city, limit: q.limit ?? 20 });
      if (!hits.length) return sql();
      const rows = await this.orgs.search({ type: q.type as OrgType | undefined, city: q.city, lat: q.lat, lng: q.lng, radiusKm: q.radius_km, limit: (q.limit ?? 20) * 2 });
      const rank = new Map(hits.map((h, i) => [h.id, i]));
      const ranked = rows.filter((r) => rank.has(r.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
      return ranked.length ? ranked.slice(0, q.limit ?? 20) : sql();
    } catch {
      return sql();
    }
  }
  async getPublic(id: string) { const o = await this.orgs.findById(id); if (!o || !['active', 'suspended'].includes(o.status)) throw new AppError('NOT_FOUND'); return { ...o, locations: await this.orgs.listLocations(id) }; }

  // ---- owner/manager ----
  async create(actor: Actor, dto: CreateOrgDto) {
    if (dto.cr_number && (await this.orgs.findByCr(dto.cr_number))) throw new AppError('CONFLICT', { messageAr: 'السجل التجاري مسجّل مسبقاً.', messageEn: 'Commercial registration already registered.' });
    const org = await this.orgs.create({ type: dto.type as OrgType, legalNameAr: dto.legal_name_ar, legalNameEn: dto.legal_name_en, tradeNameAr: dto.trade_name_ar, crNumber: dto.cr_number, vatNumber: dto.vat_number, phone: dto.phone, email: dto.email, descriptionAr: dto.description_ar, createdBy: actor.userId });
    await this.orgs.upsertMember(org.id, actor.userId, 'owner', actor.userId);
    await this.uow.run((tx) => this.audit.write(tx, { action: 'organization.create', entityType: 'organization', entityId: org.id, orgId: org.id, actorUserId: actor.userId, after: { type: org.type, legalNameAr: org.legalNameAr }, requestId: actor.requestId ?? null }));
    return org;
  }
  async get(id: string) { const o = await this.orgs.findById(id); if (!o) throw new AppError('NOT_FOUND'); return { ...o, locations: await this.orgs.listLocations(id), members: await this.orgs.listMembers(id), kyb_documents: await this.orgs.listKybDocs(id), subscription: await this.subs.current(id) }; }
  update(id: string, dto: UpdateOrgDto) { return this.orgs.update(id, { legalNameAr: dto.legal_name_ar, legalNameEn: dto.legal_name_en, tradeNameAr: dto.trade_name_ar, phone: dto.phone, email: dto.email, descriptionAr: dto.description_ar, vatNumber: dto.vat_number, vatRegistered: dto.vat_number ? true : undefined }); }
  /** The industrial zone is derived from the point when the workshop does not name one — pilot cohorts
   *  must not depend on someone typing «الصناعية الثانية» the same way twice (Step 25). */
  async addLocation(id: string, dto: AddLocationDto) {
    const zone = dto.industrial_zone ?? (await this.pilot?.zoneOf({ lat: dto.lat, lng: dto.lng }))?.code;
    return this.orgs.addLocation(id, { nameAr: dto.name_ar, isPrimary: dto.is_primary, city: dto.city, district: dto.district, industrialZone: zone, addressLine: dto.address_line, lat: dto.lat, lng: dto.lng, serviceRadiusKm: dto.service_radius_km });
  }
  listLocations(id: string) { return this.orgs.listLocations(id); }
  async setSpecialties(id: string, dto: SetSpecialtiesDto) { await this.orgs.setSpecialties(id, dto.items.map((i) => ({ makeId: i.make_id, categoryId: i.category_id }))); return { count: dto.items.length }; }

  async addMember(actor: Actor, orgId: string, dto: AddMemberDto) {
    const org = await this.orgs.findById(orgId); if (!org) throw new AppError('NOT_FOUND');
    const role = dto.role as OrgMemberRole;
    if (!ROLES_BY_ORG_TYPE[org.type].includes(role)) throw new AppError('VALIDATION', { details: [{ path: 'role', message: `role not allowed for ${org.type}` }] });
    const phone = normalizeSaudiPhone(dto.phone); if (!phone) throw new AppError('VALIDATION', { details: [{ path: 'phone', message: 'invalid Saudi mobile' }] });
    const user = (await this.users.findByPhone(phone)) ?? (await this.users.upsertByPhone(phone));
    await this.orgs.upsertMember(orgId, user.id, role, actor.userId);
    return { user_id: user.id, role };
  }
  listMembers(orgId: string) { return this.orgs.listMembers(orgId); }
  async removeMember(orgId: string, userId: string) {
    const members = await this.orgs.listMembers(orgId);
    const target = members.find((m) => m.userId === userId);
    if (!target) throw new AppError('NOT_FOUND');
    if (target.role === 'owner' && (await this.orgs.countOwners(orgId)) <= 1) throw new AppError('CONFLICT', { messageAr: 'لا يمكن إزالة المالك الوحيد.', messageEn: 'Cannot remove the only owner.' });
    return { removed: await this.orgs.removeMember(orgId, userId) };
  }

  addKybDoc(orgId: string, dto: AddKybDocDto) { return this.orgs.addKybDoc(orgId, dto.type as KybDocType, dto.media_id, dto.expires_at ? new Date(dto.expires_at) : undefined); }
  listKybDocs(orgId: string) { return this.orgs.listKybDocs(orgId); }
  /** Owner submits for review: requires CR + owner id docs and at least one location. */
  async submitKyb(actor: Actor, orgId: string) {
    const docs = await this.orgs.listKybDocs(orgId);
    const missing = KYB_REQUIRED_DOCS.filter((t) => !docs.some((d) => d.type === t && d.status !== 'rejected'));
    if (missing.length) throw new AppError('VALIDATION', { messageAr: 'أكمل الوثائق المطلوبة أولاً.', messageEn: 'Required documents are missing.', details: { missing } });
    if ((await this.orgs.listLocations(orgId)).length === 0) throw new AppError('VALIDATION', { messageAr: 'أضف موقع المنشأة أولاً.', messageEn: 'Add the organization location first.', details: { missing: ['location'] } });
    return this.transitions.transition(orgId, 'pending_kyb', actor);
  }

  async addBankAccount(orgId: string, dto: AddBankAccountDto) {
    const iban = dto.iban.replace(/\s+/g, '').toUpperCase();
    if (!isValidSaudiIban(iban)) throw new AppError('VALIDATION', { details: [{ path: 'iban', message: 'invalid Saudi IBAN' }] });
    return this.orgs.addBankAccount(orgId, { bankName: dto.bank_name, ibanEnc: this.pii.encrypt(iban, `org:${orgId}`), ibanLast4: PiiCryptoService.last4(iban), holderName: dto.holder_name });
  }
  listBankAccounts(orgId: string) { return this.orgs.listBankAccounts(orgId); }

  listPlans(type?: OrgType) { return this.subs.listPlans(type); }
  async subscribe(orgId: string, dto: SubscribeDto) {
    const org = await this.orgs.findById(orgId); if (!org) throw new AppError('NOT_FOUND');
    const plan = await this.subs.findPlanByCode(dto.plan_code); if (!plan) throw new AppError('NOT_FOUND');
    if (!plan.appliesTo.includes(org.type)) throw new AppError('VALIDATION', { details: [{ path: 'plan_code', message: `plan not available for ${org.type}` }] });
    const sub = await this.subs.subscribe(orgId, plan.id, dto.cycle);
    await this.orgs.setCommission(orgId, plan.commissionRateBps);
    return { subscription_id: sub.id, plan_code: plan.code, commission_rate_bps: plan.commissionRateBps };
  }

  // ---- admin ----
  listForAdmin(q: { status?: OrgStatus; type?: OrgType; limit?: number }) { return this.orgs.listForAdmin({ status: q.status, type: q.type, limit: q.limit ?? 50 }); }
  async approve(actor: Actor, orgId: string, reason: string) { await this.orgs.reviewKybDocs(orgId, 'approved' satisfies KybDocStatus, actor.userId); return this.transitions.transition(orgId, 'active', { ...actor, type: 'admin' }, reason); }
  async reject(actor: Actor, orgId: string, reason: string) { await this.orgs.reviewKybDocs(orgId, 'rejected', actor.userId, reason); return this.transitions.transition(orgId, 'draft', { ...actor, type: 'admin' }, reason); }
  suspend(actor: Actor, orgId: string, reason: string) { return this.transitions.transition(orgId, 'suspended', { ...actor, type: 'admin' }, reason); }
  reactivate(actor: Actor, orgId: string, reason: string) { return this.transitions.transition(orgId, 'active', { ...actor, type: 'admin' }, reason); }
}
