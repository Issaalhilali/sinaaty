import type { ZatcaStatus } from '@sinaaty/shared-types';
/** An EGS unit (Electronic Generation Solution) — one CSID + one PIH/ICV chain per unit. */
export interface ZatcaDevice { id: string; orgId: string; unitName: string; isProduction: boolean; lastIcv: string; lastHash: string | null; csidExpiresAt: Date | null; createdAt: Date }
export interface ZatcaSubmission { id: string; invoiceId: string; deviceId: string | null; mode: 'clearance' | 'reporting'; requestHash: string | null; responseCode: number | null; status: ZatcaStatus; warnings: unknown; errors: unknown; submittedAt: Date }
/** Stored encrypted (AES-256-GCM) — the private key never leaves the database in clear text. */
export interface CsidMaterial { privateKeyPem: string; certificatePem: string; binarySecurityToken: string; secret: string; complianceRequestId?: string; production: boolean }
/** Standard (B2B) invoices are cleared *before* being given to the buyer; simplified (B2C) are reported after. */
export const submissionMode = (invoiceType: string): 'clearance' | 'reporting' => (invoiceType === 'standard_tax' ? 'clearance' : 'reporting');
export const isPhase2Ready = (d: Pick<ZatcaDevice, 'isProduction'> | null): boolean => !!d?.isProduction;
