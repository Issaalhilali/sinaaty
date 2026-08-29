import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import { asTx, PrismaService } from '../../../../prisma';
import type { User } from '../../domain/user';
import type { UserRepository } from '../../domain/repositories';

const select = { id: true, phoneE164: true, fullNameAr: true, email: true, nameChangedAt: true, status: true, platformRole: true, nafathVerifiedAt: true, organizationMembersAsUser: { where: { isActive: true }, orderBy: { joinedAt: 'asc' }, select: { orgId: true, role: true } } } satisfies Prisma.UserSelect;
type Row = Prisma.UserGetPayload<{ select: typeof select }>;

const toUser = (r: Row): User => ({
  id: r.id, phone: r.phoneE164, fullNameAr: r.fullNameAr,
  email: r.email,
  nameChangedAt: r.nameChangedAt, status: r.status, platformRole: r.platformRole,
  nafathVerifiedAt: r.nafathVerifiedAt, orgs: r.organizationMembersAsUser.map((m) => ({ orgId: m.orgId, role: m.role })),
});

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async findById(id: string) { const r = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select }); return r ? toUser(r) : null; }
  async findByPhone(phone: string) { const r = await this.prisma.user.findFirst({ where: { phoneE164: phone, deletedAt: null }, select }); return r ? toUser(r) : null; }
  async findByNationalIdHash(hash: string) { const r = await this.prisma.user.findFirst({ where: { nationalIdHash: hash, deletedAt: null }, select }); return r ? toUser(r) : null; }
  async listIdsByPlatformRole(roles: string[]) {
    const rows = await this.prisma.user.findMany({ where: { platformRole: { in: roles as never }, status: 'active', deletedAt: null }, select: { id: true } });
    return rows.map((r) => r.id);
  }
  async upsertByPhone(phone: string) {
    const r = await this.prisma.user.upsert({ where: { phoneE164: phone }, update: {}, create: { phoneE164: phone, status: 'active', userIdentities: { create: { provider: 'otp_phone', providerUid: phone } } }, select });
    return toUser(r);
  }
  async upsertByNafath(i: { nationalIdHash: string; nationalIdEnc: Buffer; nafathSub: string; fullNameAr?: string; phone?: string }) {
    const now = new Date();
    const existing = await this.prisma.user.findFirst({ where: { nationalIdHash: i.nationalIdHash }, select: { id: true } });
    const r = existing
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { nafathVerifiedAt: now, status: 'active', fullNameAr: i.fullNameAr ?? undefined }, select })
      : await this.prisma.user.create({ data: { nationalIdHash: i.nationalIdHash, nationalIdEnc: new Uint8Array(i.nationalIdEnc), fullNameAr: i.fullNameAr, phoneE164: i.phone, status: 'active', nafathVerifiedAt: now, userIdentities: { create: { provider: 'nafath', providerUid: i.nafathSub } } }, select });
    if (existing) await this.prisma.userIdentity.upsert({ where: { provider_providerUid: { provider: 'nafath', providerUid: i.nafathSub } }, update: {}, create: { userId: existing.id, provider: 'nafath', providerUid: i.nafathSub } });
    return toUser(r);
  }
  async touchLogin(userId: string) { await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }); }
  async anonymize(userId: string, tx?: TxHandle) {
    // الجوال إلى NULL لا إلى شاهدة قبرٍ مزيفة: حارس القاعدة (سعودي حصراً) صدّ كل بديلٍ مُختلَق —
    // وهذا صوابه: قيدُ هويةٍ لا يُثقب لحالةٍ خاصة. والفريد يسمح بتعدد NULL فلا تصادم.
    await this.db(tx).user.update({ where: { id: userId }, data: {
      phoneE164: null, email: null, fullNameAr: 'حساب محذوف', fullNameEn: 'Deleted account',
      nationalIdEnc: null, nationalIdHash: null, dateOfBirth: null, status: 'deleted', deletedAt: new Date(),
    } });
    // أجهزته تُمحى معه — لا إشعار يطرق باب حسابٍ محذوف
    await this.db(tx).device.deleteMany({ where: { userId } });
    // وهويات دخوله تُحرَّر: القيد الفريد (provider, provider_uid) كان يمسك الرقم فيمنع
    // صاحبَه الحقيقي من البدء من جديد — عاش الرقمُ محجوزاً لحسابٍ ميت (اصطاده الاختبار حياً)
    await this.db(tx).userIdentity.deleteMany({ where: { userId } });
  }
  async updateProfile(userId: string, p: { fullNameAr?: string; email?: string | null; nameChangedAt?: Date }) { const r = await this.prisma.user.update({ where: { id: userId }, data: { fullNameAr: p.fullNameAr, email: p.email, nameChangedAt: p.nameChangedAt }, select }); return toUser(r); }
}
