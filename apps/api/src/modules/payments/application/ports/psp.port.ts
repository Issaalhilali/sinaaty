import type { PaymentMethod } from '@sinaaty/shared-types';
/** Licensed PSP (Mada/Apple Pay/cards). Assumed contract: docs/integrations/psp.md. */
export interface PspIntent { intentId: string; clientSecret?: string; redirectUrl?: string; expiresAt: Date }
export interface PspWebhookEvent { eventId: string; type: 'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'refund.failed'; intentId: string; chargeId?: string; refundId?: string; amount: string; currency: string; occurredAt: Date; raw: unknown }
export interface PspPort {
  readonly provider: string;
  createIntent(i: { paymentId: string; amount: string; currency: 'SAR'; method: PaymentMethod; description: string; metadata: Record<string, string> }): Promise<PspIntent>;
  /** Verifies signature and parses; throws AppError('PAY_WEBHOOK_INVALID') on bad signature. */
  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): PspWebhookEvent;
  refund(chargeId: string, amount: string, reason: string): Promise<{ refundId: string; status: 'pending' | 'succeeded' }>;
  payout(i: { payoutId: string; ibanLast4: string; amount: string }): Promise<{ providerRef: string; status: 'processing' | 'paid' }>;
}
export const PSP_PORT = Symbol('PSP_PORT');
