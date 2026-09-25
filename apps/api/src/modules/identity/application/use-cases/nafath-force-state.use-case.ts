import { Inject, Injectable } from '@nestjs/common';
import { safeEqual } from '../../../../common/crypto/aes-gcm';
import { AppError } from '../../../../common/errors';
import { AppConfig } from '../../../../config';
import { NAFATH_DEV_HOOK_PORT, type NafathDevHookPort } from '../ports/nafath.port';
import type { NafathCallbackDto } from '../dto/auth.dto';

/** Provider callback endpoint backing use case (mock: forces state; secured by shared secret). */
@Injectable()
export class NafathForceStateUseCase {
  constructor(@Inject(NAFATH_DEV_HOOK_PORT) private readonly hook: NafathDevHookPort, private readonly config: AppConfig) {}
  execute(dto: NafathCallbackDto, secret: string | undefined): { updated: boolean } {
    // Constant-time: a length/prefix oracle on this header would let a caller recover the secret.
    if (!safeEqual(secret ?? '', this.config.get('NAFATH_CALLBACK_SECRET'))) throw new AppError('UNAUTHORIZED');
    if (this.config.get('INTEGRATION_NAFATH') !== 'mock') throw new AppError('SERVICE_UNAVAILABLE');
    return { updated: this.hook.force(dto.transaction_id, dto.status) };
  }
}
