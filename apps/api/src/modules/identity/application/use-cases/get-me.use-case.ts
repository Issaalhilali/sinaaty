import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { AppConfig } from '../../../../config';
import { USER_REPOSITORY, type UserRepository } from '../../domain/repositories';

@Injectable()
export class GetMeUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository, private readonly config: AppConfig) {}
  async execute(userId: string) {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError('NOT_FOUND');
    return { id: u.id, phone: u.phone, full_name_ar: u.fullNameAr, email: u.email, status: u.status, platform_role: u.platformRole, nafath_verified: !!u.nafathVerifiedAt, name_locked_until: this.nameLockedUntil(u), orgs: u.orgs.map((o) => ({ org_id: o.orgId, role: o.role })) };
  }

  /** من يدخل برمز الجوال يبقى بلا اسم إلى الأبد: الورشة ترى رقماً، و«حسابي» فارغة. يكتبه بنفسه هنا —
   *  إلا إن كان موثّقاً بنفاذ، فاسمه هناك اسم قانوني لا يُستبدل بما يُكتب باليد. */
  /** الاسم يوقّع الاعتمادات: تقلّبه يهدم حجيتها، فلا يتغيّر إلا بعد مهلة من آخر تغيير.
   *  أول كتابةٍ له ليست «تغييراً» — بدايةٌ لا تقلّب. */
  private nameLockedUntil(u: { fullNameAr: string | null; nameChangedAt: Date | null }): Date | null {
    const days = this.config.get('NAME_CHANGE_COOLDOWN_DAYS');
    if (!u.fullNameAr || !u.nameChangedAt || days <= 0) return null;
    const until = new Date(u.nameChangedAt.getTime() + days * 86_400_000);
    return until.getTime() > Date.now() ? until : null;
  }

  async updateProfile(userId: string, p: { fullNameAr?: string; email?: string | null }) {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError('NOT_FOUND');
    const changingName = p.fullNameAr !== undefined && p.fullNameAr !== u.fullNameAr;
    if (changingName && u.nafathVerifiedAt) throw new AppError('VALIDATION', { messageAr: 'اسمك موثّق عبر نفاذ ولا يُعدّل من التطبيق.', messageEn: 'Your name is Nafath-verified and cannot be edited here.' });
    if (changingName) {
      const lock = this.nameLockedUntil(u);
      if (lock) {
        const dateAr = lock.toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' });
        throw new AppError('VALIDATION', { messageAr: `الاسم يُغيَّر مرة كل فترة حفاظاً على حجية اعتماداتك — يمكنك تغييره بعد ${dateAr}.`, messageEn: `Names can only change occasionally to protect your signed approvals — next change after ${lock.toISOString().slice(0, 10)}.` });
      }
    }
    try {
      await this.users.updateProfile(userId, { ...p, nameChangedAt: changingName ? new Date() : undefined });
    } catch (e) {
      // بريدٌ يملكه حسابٌ آخر: نقولها بلسانٍ مفهوم لا برسالة تعارضٍ عامة
      if ((e as { code?: string }).code === 'P2002') throw new AppError('CONFLICT', { messageAr: 'هذا البريد مستخدم في حساب آخر.', messageEn: 'This email is used by another account.' });
      throw e;
    }
    return this.execute(userId);
  }
}
