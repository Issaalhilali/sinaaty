import { Injectable } from '@nestjs/common';
import type { NafezCreateInput, NafezCreateResult, NafezPort } from '../../application/ports/nafez.port';

/** نافذ mock: issues immediately; state kept in memory; idempotent by key. Live adapter per docs/integrations/nafez.md. */
@Injectable()
export class NafezMockAdapter implements NafezPort {
  private readonly notes = new Map<string, { status: 'issued' | 'closed' | 'cancelled'; outstanding: string }>();
  private readonly seen = new Map<string, NafezCreateResult>();
  private seq = 0;
  createNote(input: NafezCreateInput, idempotencyKey: string): Promise<NafezCreateResult> {
    const prev = this.seen.get(idempotencyKey); if (prev) return Promise.resolve(prev);
    const noteRef = `NFZ-${new Date().getFullYear()}-${String(++this.seq + Date.now() % 100000).padStart(8, '0')}`;
    this.notes.set(noteRef, { status: 'issued', outstanding: input.amount });
    const res: NafezCreateResult = { noteRef, status: 'issued', issuedAt: new Date(), raw: { mock: true, internal: input.internalNumber } };
    this.seen.set(idempotencyKey, res); return Promise.resolve(res);
  }
  getStatus(noteRef: string) { const n = this.notes.get(noteRef); return Promise.resolve(n ? { status: n.status, outstanding: n.outstanding } : { status: 'rejected' as const }); }
  updateOutstanding(noteRef: string, outstanding: string) { const n = this.notes.get(noteRef); if (n) n.outstanding = outstanding; return Promise.resolve({ ok: true as const }); }
  closeNote(noteRef: string, input: { reason: 'paid' | 'cancelled' | 'settled' }) { const n = this.notes.get(noteRef); if (n) n.status = input.reason === 'cancelled' ? 'cancelled' : 'closed'; return Promise.resolve({ status: input.reason === 'cancelled' ? ('cancelled' as const) : ('closed' as const), closedAt: new Date() }); }
}
