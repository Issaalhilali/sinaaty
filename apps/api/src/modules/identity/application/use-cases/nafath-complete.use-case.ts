import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { USER_REPOSITORY, type UserRepository } from '../../domain/repositories';
import { HASHER_PORT, type HasherPort } from '../ports/hasher.port';
import { NAFATH_PORT, type NafathPort } from '../ports/nafath.port';
import type { IssuedTokens } from '../ports/token.port';
import type { RegisterDeviceDto } from '../dto/auth.dto';
import { SessionService } from '../session.service';

export type NafathPollResult = { status: 'pending' } | ({ status: 'approved'; user_id: string; is_new: boolean } & IssuedTokens);

/** Poll Nafath status; on approval upsert the verified user and open a session (once). */
@Injectable()
export class NafathCompleteUseCase {
  constructor(
    @Inject(NAFATH_PORT) private readonly nafath: NafathPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(HASHER_PORT) private readonly hasher: HasherPort,
    private readonly session: SessionService,
  ) {}

  async execute(transactionId: string, device?: RegisterDeviceDto): Promise<NafathPollResult> {
    const r = await this.nafath.status(transactionId);
    if (r.status === 'pending') return { status: 'pending' };
    if (r.status !== 'approved' || !r.claims) throw new AppError('NAFATH_REJECTED');
    const hash = this.hasher.nationalIdHash(r.claims.nationalId);
    const existing = await this.users.findByNationalIdHash(hash);
    const user = await this.users.upsertByNafath({ nationalIdHash: hash, nationalIdEnc: this.hasher.encryptNationalId(r.claims.nationalId), nafathSub: r.claims.sub, fullNameAr: r.claims.fullNameAr, phone: r.claims.phone });
    const tokens = await this.session.open(user, device);
    return { status: 'approved', user_id: user.id, is_new: !existing, ...tokens };
  }
}
