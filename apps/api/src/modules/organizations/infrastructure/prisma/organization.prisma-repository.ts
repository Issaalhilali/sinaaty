import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { KybDocStatus, KybDocType, OrgMemberRole, OrgStatus, OrgType } from '@sinaaty/shared-types';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { Organization } from '../../domain/organization';
import type { KybDoc, OrgLocation, OrgMember, OrgSearchHit, OrganizationRepository } from '../../domain/repositories';

const orgSelect = { acceptingRequests: true, id: true, type: true, status: true, legalNameAr: true, legalNameEn: true, tradeNameAr: true, slug: true, crNumber: true, vatNumber: true, vatRegistered: true, phoneE164: true, email: true, descriptionAr: true, ratingAvg: true, ratingCount: true, commissionRateBps: true, verifiedAt: true, createdBy: true, createdAt: true } satisfies Prisma.OrganizationSelect;
type OrgRow = Prisma.OrganizationGetPayload<{ select: typeof orgSelect }>;
const toOrg = (r: OrgRow): Organization => ({ id: r.id, type: r.type, status: r.status, legalNameAr: r.legalNameAr, legalNameEn: r.legalNameEn, tradeNameAr: r.tradeNameAr, acceptingRequests: r.acceptingRequests, slug: r.slug, crNumber: r.crNumber, vatNumber: r.vatNumber, vatRegistered: r.vatRegistered, phone: r.phoneE164, email: r.email, descriptionAr: r.descriptionAr, ratingAvg: r.ratingAvg.toFixed(2), ratingCount: r.ratingCount, commissionRateBps: r.commissionRateBps, verifiedAt: r.verifiedAt, createdBy: r.createdBy, createdAt: r.createdAt });

interface LocRow { id: string; name_ar: string | null; is_primary: boolean; city: string; district: string | null; industrial_zone: string | null; address_line: string | null; lat: number; lng: number; service_radius_km: number }
const toLoc = (r: LocRow): OrgLocation => ({ id: r.id, nameAr: r.name_ar, isPrimary: r.is_primary, city: r.city, district: r.district, industrialZone: r.industrial_zone, addressLine: r.address_line, lat: Number(r.lat), lng: Number(r.lng), serviceRadiusKm: r.service_radius_km });

@Injectable()
export class OrganizationPrismaRepository implements OrganizationRepository {
  async listServiceItems(orgId: string) { const rows = await this.prisma.orgServiceItem.findMany({ where: { orgId, isActive: true }, orderBy: { createdAt: 'asc' } }); return rows.map((r) => ({ id: r.id, nameAr: r.nameAr, itemType: r.itemType, unitPrice: r.unitPrice.toFixed(2), warrantyDays: r.warrantyDays })); }
  async addServiceItem(orgId: string, p: { nameAr: string; itemType: string; unitPrice: string; warrantyDays: number }) { const r = await this.prisma.orgServiceItem.create({ data: { orgId, nameAr: p.nameAr, itemType: p.itemType as never, unitPrice: p.unitPrice, warrantyDays: p.warrantyDays }, select: { id: true } }); return r; }
  async removeServiceItem(orgId: string, id: string) { const r = await this.prisma.orgServiceItem.updateMany({ where: { id, orgId }, data: { isActive: false } }); return r.count > 0; }
  async setAcceptingRequests(orgId: string, accepting: boolean) { await this.prisma.organization.update({ where: { id: orgId }, data: { acceptingRequests: accepting } }); }
  constructor(private readonly prisma: PrismaService) {}

  async create(i: Parameters<OrganizationRepository['create']>[0]) {
    const r = await this.prisma.organization.create({ data: { type: i.type, status: 'draft', legalNameAr: i.legalNameAr, legalNameEn: i.legalNameEn, tradeNameAr: i.tradeNameAr ?? i.legalNameAr, slug: i.slug, crNumber: i.crNumber, vatNumber: i.vatNumber, vatRegistered: !!i.vatNumber, phoneE164: i.phone, email: i.email, descriptionAr: i.descriptionAr, createdBy: i.createdBy }, select: orgSelect });
    return toOrg(r);
  }
  async findById(id: string) { const r = await this.prisma.organization.findFirst({ where: { id, deletedAt: null }, select: orgSelect }); return r ? toOrg(r) : null; }
  async findByCr(cr: string) { const r = await this.prisma.organization.findFirst({ where: { crNumber: cr }, select: orgSelect }); return r ? toOrg(r) : null; }
  async update(id: string, p: Parameters<OrganizationRepository['update']>[1]) {
    const r = await this.prisma.organization.update({ where: { id }, data: { legalNameAr: p.legalNameAr, legalNameEn: p.legalNameEn, tradeNameAr: p.tradeNameAr, phoneE164: p.phone, email: p.email, descriptionAr: p.descriptionAr, vatNumber: p.vatNumber, vatRegistered: p.vatRegistered }, select: orgSelect });
    return toOrg(r);
  }
  async setStatus(id: string, status: OrgStatus, extra?: { verifiedAt?: Date | null }, tx?: TxHandle) { const db = tx ? asTx(tx) : this.prisma; const r = await db.organization.update({ where: { id }, data: { status, verifiedAt: extra?.verifiedAt }, select: orgSelect }); return toOrg(r); }
  async setCommission(id: string, bps: number) { await this.prisma.organization.update({ where: { id }, data: { commissionRateBps: bps } }); }

  async search(q: { type?: OrgType; city?: string; lat?: number; lng?: number; radiusKm?: number; text?: string; ids?: string[]; makeId?: number; limit: number }): Promise<OrgSearchHit[]> {
    const hasGeo = q.lat !== undefined && q.lng !== undefined;
    const point = hasGeo ? Prisma.sql`ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography` : null;
    // «متخصّصة بسيارتك» أقوى من «قريبة منك»: صاحب التويوتا يريد من يعرف التويوتا. تُحسب هنا ولا
    // تُصفّي — الترتيب يقدّمها، والبقية تبقى ظاهرة كي لا يخلو الحيّ من نتائج.
    const spec = q.makeId !== undefined
      ? Prisma.sql`EXISTS (SELECT 1 FROM organization_specialties sp WHERE sp.org_id = o.id AND sp.make_id = ${q.makeId})`
      : Prisma.sql`false`;
    const rows = await this.prisma.$queryRaw<Array<{ id: string; type: OrgType; trade_name_ar: string | null; legal_name_ar: string; rating_avg: Prisma.Decimal; rating_count: number; city: string | null; distance_km: number | null; lat: number | null; lng: number | null; specialised: boolean }>>`
      SELECT o.id, o.type, o.trade_name_ar, o.legal_name_ar, o.rating_avg, o.rating_count, l.city, ${spec} AS specialised,
             ${point ? Prisma.sql`ST_Distance(l.geo, ${point}) / 1000.0` : Prisma.sql`NULL::float8`} AS distance_km,
             ST_Y(l.geo::geometry) AS lat, ST_X(l.geo::geometry) AS lng
      FROM organizations o
      LEFT JOIN organization_locations l ON l.org_id = o.id AND l.is_primary = true
      WHERE o.status = 'active' AND o.deleted_at IS NULL
        ${q.ids ? Prisma.sql`AND o.id = ANY(${q.ids}::uuid[])` : Prisma.empty}
        ${q.type ? Prisma.sql`AND o.type = ${q.type}::org_type` : Prisma.empty}
        ${q.city ? Prisma.sql`AND l.city = ${q.city}` : Prisma.empty}
        ${q.text ? Prisma.sql`AND (o.trade_name_ar ILIKE ${'%' + q.text + '%'} OR o.legal_name_ar ILIKE ${'%' + q.text + '%'} OR similarity(o.trade_name_ar, ${q.text}) > 0.3)` : Prisma.empty}
        ${point ? Prisma.sql`AND l.geo IS NOT NULL AND ST_DWithin(l.geo, ${point}, ${(q.radiusKm ?? 25) * 1000})` : Prisma.empty}
      ORDER BY ${q.makeId !== undefined ? Prisma.sql`specialised DESC,` : Prisma.empty} ${point ? Prisma.sql`distance_km ASC NULLS LAST,` : Prisma.empty} o.rating_avg DESC, o.rating_count DESC
      LIMIT ${q.limit}`;
    return rows.map((r) => ({ id: r.id, type: r.type, tradeNameAr: r.trade_name_ar, legalNameAr: r.legal_name_ar, ratingAvg: r.rating_avg.toFixed(2), ratingCount: r.rating_count, city: r.city, distanceKm: r.distance_km === null ? null : Number(Number(r.distance_km).toFixed(2)), lat: r.lat === null ? null : Number(r.lat), lng: r.lng === null ? null : Number(r.lng), specialised: r.specialised }));
  }
  async listForAdmin(q: { status?: OrgStatus; type?: OrgType; limit: number }) { const rows = await this.prisma.organization.findMany({ where: { status: q.status, type: q.type, deletedAt: null }, orderBy: { createdAt: 'asc' }, take: q.limit, select: orgSelect }); return rows.map(toOrg); }

  async listByIds(ids: string[]) { if (!ids.length) return []; const rows = await this.prisma.organization.findMany({ where: { id: { in: ids }, deletedAt: null }, orderBy: { createdAt: 'asc' }, select: orgSelect }); return rows.map(toOrg); }

  async listMembers(orgId: string): Promise<OrgMember[]> {
    const rows = await this.prisma.organizationMember.findMany({ where: { orgId }, select: { userId: true, role: true, isActive: true, joinedAt: true, user: { select: { phoneE164: true, fullNameAr: true } } }, orderBy: { joinedAt: 'asc' } });
    return rows.map((m) => ({ userId: m.userId, role: m.role, isActive: m.isActive, joinedAt: m.joinedAt, phone: m.user.phoneE164, fullNameAr: m.user.fullNameAr }));
  }
  async upsertMember(orgId: string, userId: string, role: OrgMemberRole, invitedBy: string) { await this.prisma.organizationMember.upsert({ where: { orgId_userId: { orgId, userId } }, update: { role, isActive: true }, create: { orgId, userId, role, invitedBy } }); }
  async removeMember(orgId: string, userId: string) { const r = await this.prisma.organizationMember.deleteMany({ where: { orgId, userId } }); return r.count === 1; }
  countOwners(orgId: string) { return this.prisma.organizationMember.count({ where: { orgId, role: 'owner', isActive: true } }); }

  async addLocation(orgId: string, l: Parameters<OrganizationRepository['addLocation']>[1]): Promise<OrgLocation> {
    const isPrimary = l.isPrimary ?? (await this.prisma.organizationLocation.count({ where: { orgId } })) === 0;
    if (isPrimary) await this.prisma.$executeRaw`UPDATE organization_locations SET is_primary = false WHERE org_id = ${orgId}::uuid`;
    const rows = await this.prisma.$queryRaw<LocRow[]>`
      INSERT INTO organization_locations (org_id, name_ar, is_primary, city, district, industrial_zone, address_line, geo, service_radius_km)
      VALUES (${orgId}::uuid, ${l.nameAr ?? null}, ${isPrimary}, ${l.city}, ${l.district ?? null}, ${l.industrialZone ?? null}, ${l.addressLine ?? null},
              ST_SetSRID(ST_MakePoint(${l.lng}, ${l.lat}), 4326)::geography, ${l.serviceRadiusKm ?? 25})
      RETURNING id, name_ar, is_primary, city, district, industrial_zone, address_line, ST_Y(geo::geometry) AS lat, ST_X(geo::geometry) AS lng, service_radius_km`;
    return toLoc(rows[0]!);
  }
  async listLocations(orgId: string) {
    const rows = await this.prisma.$queryRaw<LocRow[]>`SELECT id, name_ar, is_primary, city, district, industrial_zone, address_line, ST_Y(geo::geometry) AS lat, ST_X(geo::geometry) AS lng, service_radius_km FROM organization_locations WHERE org_id = ${orgId}::uuid ORDER BY is_primary DESC, created_at ASC`;
    return rows.map(toLoc);
  }
  async setSpecialties(orgId: string, items: Array<{ makeId?: number; categoryId?: number }>) {
    await this.prisma.$transaction([
      this.prisma.organizationSpecialty.deleteMany({ where: { orgId } }),
      ...(items.length ? [this.prisma.organizationSpecialty.createMany({ data: items.map((i) => ({ orgId, makeId: i.makeId ?? null, categoryId: i.categoryId ?? null })), skipDuplicates: true })] : []),
    ]);
  }

  async listSpecialtiesPublic(orgId: string) {
    const rows = await this.prisma.organizationSpecialty.findMany({
      where: { orgId },
      select: { make: { select: { nameAr: true } }, category: { select: { nameAr: true } } },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => ({ makeAr: r.make?.nameAr ?? null, categoryAr: r.category?.nameAr ?? null }));
  }

  async addKybDoc(orgId: string, type: KybDocType, mediaId: string, expiresAt?: Date): Promise<KybDoc> {
    const r = await this.prisma.kybDocument.create({ data: { orgId, type, mediaId, expiresAt }, select: { id: true, type: true, mediaId: true, status: true, rejectionReason: true, createdAt: true } });
    return r;
  }
  listKybDocs(orgId: string) { return this.prisma.kybDocument.findMany({ where: { orgId }, select: { id: true, type: true, mediaId: true, status: true, rejectionReason: true, createdAt: true }, orderBy: { createdAt: 'asc' } }); }
  async reviewKybDocs(orgId: string, status: KybDocStatus, reviewedBy: string, reason?: string) { await this.prisma.kybDocument.updateMany({ where: { orgId, status: 'pending' }, data: { status, reviewedBy, reviewedAt: new Date(), rejectionReason: reason } }); }

  async addBankAccount(orgId: string, b: { bankName: string; ibanEnc: Buffer; ibanLast4: string; holderName: string }) {
    const isDefault = (await this.prisma.organizationBankAccount.count({ where: { orgId } })) === 0;
    const r = await this.prisma.organizationBankAccount.create({ data: { orgId, bankName: b.bankName, ibanEnc: new Uint8Array(b.ibanEnc), ibanLast4: b.ibanLast4, holderName: b.holderName, isDefault }, select: { id: true } });
    return r;
  }
  listBankAccounts(orgId: string) { return this.prisma.organizationBankAccount.findMany({ where: { orgId }, select: { id: true, bankName: true, ibanLast4: true, holderName: true, isDefault: true, verifiedAt: true }, orderBy: { createdAt: 'asc' } }); }
}
