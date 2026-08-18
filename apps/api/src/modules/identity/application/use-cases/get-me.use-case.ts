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
}
