/** Pure OTP rules — no framework, no crypto (hashing lives in infrastructure). */
export const OTP_LENGTH = 6;
export type OtpPurpose = 'login' | 'sign_work_order' | 'payout_confirm' | 'accept_delivery';

export interface OtpChallenge {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

export function otpIsExpired(c: OtpChallenge, now: Date): boolean {
  return c.expiresAt.getTime() <= now.getTime();
}
export function otpAttemptsExhausted(c: OtpChallenge, max: number): boolean {
  return c.attempts >= max;
}
/** E.164 Saudi mobile normalisation: 05xxxxxxxx | 5xxxxxxxx | +9665xxxxxxxx | 009665… → +9665xxxxxxxx */
export function normalizeSaudiPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  const m = /^(?:\+?966|00966|0)?(5\d{8})$/.exec(digits);
  return m ? `+966${m[1]}` : null;
}
