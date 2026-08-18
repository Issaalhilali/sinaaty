import { Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { AppConfig } from '../../../../config';
import { AppError } from '../../../../common/errors';
import type { NafathInitiateResult, NafathPort, NafathStatusResult } from '../../application/ports/nafath.port';

interface Tx { nationalId: string; random: string; createdAt: number; expiresAt: number; forced?: 'approved' | 'rejected' | 'expired' }

/**
 * Simulates نفاذ: initiate → 2-digit random → auto-approves after NAFATH_MOCK_AUTO_APPROVE_MS
 * (0 = immediately). `POST /v1/auth/nafath/callback` (dev only) can force approved/rejected/expired.
 * State is in-memory (single process) — fine for dev/test.
 */
@Injectable()
export class NafathMockAdapter implements NafathPort {
  private readonly txs = new Map<string, Tx>();
  constructor(private readonly config: AppConfig) {}

  initiate(nationalId: string, _purpose: 'login' | 'sign'): Promise<NafathInitiateResult> {
    const id = randomUUID(); const now = Date.now();
    const tx: Tx = { nationalId, random: String(randomInt(10, 100)), createdAt: now, expiresAt: now + 3 * 60_000 };
    this.txs.set(id, tx);
    return Promise.resolve({ transactionId: id, random: tx.random, expiresAt: new Date(tx.expiresAt) });
  }
  status(transactionId: string): Promise<NafathStatusResult> {
    const tx = this.txs.get(transactionId);
    if (!tx) throw new AppError('NAFATH_NOT_FOUND');
    const now = Date.now();
    const state = tx.forced ?? (now >= tx.expiresAt ? 'expired' : now - tx.createdAt >= this.config.get('NAFATH_MOCK_AUTO_APPROVE_MS') ? 'approved' : 'pending');
    if (state !== 'approved') return Promise.resolve({ status: state });
    return Promise.resolve({ status: 'approved', claims: { nationalId: tx.nationalId, sub: `nafath:${tx.nationalId}`, fullNameAr: 'مستخدم نفاذ (تجريبي)', phone: undefined } });
  }
  /** Test/dev hook. */
  force(transactionId: string, state: 'approved' | 'rejected' | 'expired'): boolean {
    const tx = this.txs.get(transactionId); if (!tx) return false; tx.forced = state; return true;
  }
}
