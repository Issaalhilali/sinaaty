import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { USER_REPOSITORY, type UserRepository } from '../../domain/repositories';

@Injectable()
export class GetMeUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
  async execute(userId: string) {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError('NOT_FOUND');
    return { id: u.id, phone: u.phone, full_name_ar: u.fullNameAr, status: u.status, platform_role: u.platformRole, nafath_verified: !!u.nafathVerifiedAt, orgs: u.orgs.map((o) => ({ org_id: o.orgId, role: o.role })) };
  }

  /** من يدخل برمز الجوال يبقى بلا اسم إلى الأبد: الورشة ترى رقماً، و«حسابي» فارغة. يكتبه بنفسه هنا —
   *  إلا إن كان موثّقاً بنفاذ، فاسمه هناك اسم قانوني لا يُستبدل بما يُكتب باليد. */
  async setName(userId: string, fullNameAr: string) {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError('NOT_FOUND');
    if (u.nafathVerifiedAt) throw new AppError('VALIDATION', { messageAr: 'اسمك موثّق عبر نفاذ ولا يُعدّل من التطبيق.', messageEn: 'Your name is Nafath-verified and cannot be edited here.' });
    await this.users.setSelfDeclaredName(userId, fullNameAr);
    return this.execute(userId);
  }
}
