import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { USER_REPOSITORY, type UserRepository } from '../../domain/repositories';

@Injectable()
export class GetMeUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
  async execute(userId: string) {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError('NOT_FOUND');
    return { id: u.id, phone: u.phone, full_name_ar: u.fullNameAr, email: u.email, status: u.status, platform_role: u.platformRole, nafath_verified: !!u.nafathVerifiedAt, orgs: u.orgs.map((o) => ({ org_id: o.orgId, role: o.role })) };
  }

  /** من يدخل برمز الجوال يبقى بلا اسم إلى الأبد: الورشة ترى رقماً، و«حسابي» فارغة. يكتبه بنفسه هنا —
   *  إلا إن كان موثّقاً بنفاذ، فاسمه هناك اسم قانوني لا يُستبدل بما يُكتب باليد. */
  async updateProfile(userId: string, p: { fullNameAr?: string; email?: string | null }) {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError('NOT_FOUND');
    if (p.fullNameAr !== undefined && u.nafathVerifiedAt) throw new AppError('VALIDATION', { messageAr: 'اسمك موثّق عبر نفاذ ولا يُعدّل من التطبيق.', messageEn: 'Your name is Nafath-verified and cannot be edited here.' });
    try {
      await this.users.updateProfile(userId, p);
    } catch (e) {
      // بريدٌ يملكه حسابٌ آخر: نقولها بلسانٍ مفهوم لا برسالة تعارضٍ عامة
      if ((e as { code?: string }).code === 'P2002') throw new AppError('CONFLICT', { messageAr: 'هذا البريد مستخدم في حساب آخر.', messageEn: 'This email is used by another account.' });
      throw e;
    }
    return this.execute(userId);
  }
}
