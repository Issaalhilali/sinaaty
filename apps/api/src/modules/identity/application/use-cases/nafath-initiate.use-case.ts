import { Inject, Injectable } from '@nestjs/common';
import { NAFATH_PORT, type NafathPort } from '../ports/nafath.port';
import type { NafathInitiateDto } from '../dto/auth.dto';

@Injectable()
export class NafathInitiateUseCase {
  constructor(@Inject(NAFATH_PORT) private readonly nafath: NafathPort) {}
  async execute(dto: NafathInitiateDto): Promise<{ transaction_id: string; random: string; expires_at: string }> {
    const r = await this.nafath.initiate(dto.national_id, 'login');
    return { transaction_id: r.transactionId, random: r.random, expires_at: r.expiresAt.toISOString() };
  }
}
