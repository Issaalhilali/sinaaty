/**
 * Nafath (نفاذ) port — assumed contract, see docs/integrations/nafath.md.
 * initiate → user gets a 2-digit random number to confirm in the Nafath app → status becomes approved.
 */
export type NafathStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export interface NafathInitiateResult {
  transactionId: string;
  random: string; // two digits shown to the user
  expiresAt: Date;
}
export interface NafathClaims {
  nationalId: string;
  sub: string; // provider subject
  fullNameAr?: string;
  phone?: string;
}
export interface NafathStatusResult {
  status: NafathStatus;
  claims?: NafathClaims; // present when approved
}
export interface NafathPort {
  /** Login: identify by national id; the user confirms the 2-digit number in the Nafath app. */
  initiate(nationalId: string, purpose: 'login' | 'sign'): Promise<NafathInitiateResult>;
  /** Sign a document as an already-identified user (document hash bound to the transaction). */
  initiateSign(input: { userId: string; documentHash: string; purpose: string }): Promise<NafathInitiateResult>;
  status(transactionId: string): Promise<NafathStatusResult>;
}
export const NAFATH_PORT = Symbol('NAFATH_PORT');

/** Dev/test hook to force a mock transaction's state; live adapters bind a no-op. */
export interface NafathDevHookPort {
  force(transactionId: string, state: 'approved' | 'rejected' | 'expired'): boolean;
}
export const NAFATH_DEV_HOOK_PORT = Symbol('NAFATH_DEV_HOOK_PORT');
