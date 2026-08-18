import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppConfig } from '../../../../config';
import { AppError } from '../../../../common/errors';
import type { PspIntent, PspPort, PspWebhookEvent } from '../../application/ports/psp.port';

/**
 * Mock PSP: intents live in memory; webhooks are JSON bodies signed with HMAC-SHA256(PSP_WEBHOOK_SECRET)
 * in `x-psp-signature`. `POST /v1/payments/:id/mock-pay` builds + delivers such a webhook (dev/test only).
 */
@Injectable()
export class PspMockAdapter implements PspPort {
  readonly provider = 'mock';
  private readonly intents = new Map<string, { paymentId: string; amount: string; currency: string }>();
  constructor(private readonly config: AppConfig) {}
  createIntent(i: { paymentId: string; amount: string; currency: 'SAR' }): Promise<PspIntent> {
    const intentId = `pi_mock_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    this.intents.set(intentId, { paymentId: i.paymentId, amount: i.amount, currency: i.currency });
    return Promise.resolve({ intentId, clientSecret: `${intentId}_secret`, redirectUrl: `${this.config.get('API_BASE_URL')}/v1/payments/mock-checkout/${intentId}`, expiresAt: new Date(Date.now() + 30 * 60_000) });
  }
  sign(body: string): string { return createHmac('sha256', this.config.get('PSP_WEBHOOK_SECRET')).update(body).digest('hex'); }
  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): PspWebhookEvent {
    const sig = headers['x-psp-signature'] ?? ''; const expected = this.sign(rawBody);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new AppError('PAY_WEBHOOK_INVALID');
    const b = JSON.parse(rawBody) as { id: string; type: PspWebhookEvent['type']; intent_id: string; charge_id?: string; refund_id?: string; amount: string; currency: string; created: string };
    return { eventId: b.id, type: b.type, intentId: b.intent_id, chargeId: b.charge_id, refundId: b.refund_id, amount: b.amount, currency: b.currency, occurredAt: new Date(b.created), raw: b };
  }
  /** Build a signed webhook body for an intent (used by mock-pay endpoint and tests). */
  makeWebhook(intentId: string, type: PspWebhookEvent['type'] = 'payment.succeeded', eventId = `evt_${randomUUID()}`) {
    const it = this.intents.get(intentId); if (!it) throw new AppError('NOT_FOUND', { messageEn: 'mock intent not found' });
    const body = JSON.stringify({ id: eventId, type, intent_id: intentId, charge_id: `ch_${intentId.slice(8)}`, amount: it.amount, currency: it.currency, created: new Date().toISOString() });
    return { body, headers: { 'x-psp-signature': this.sign(body) } };
  }
  refund(chargeId: string, amount: string): Promise<{ refundId: string; status: 'succeeded' }> { return Promise.resolve({ refundId: `re_${chargeId}_${amount}`, status: 'succeeded' }); }
  payout(i: { payoutId: string }): Promise<{ providerRef: string; status: 'paid' }> { return Promise.resolve({ providerRef: `po_${i.payoutId.slice(0, 8)}`, status: 'paid' }); }
}
