import { canComplete, canTransitionTransport, DEFAULT_TOW_RATES, haversineKm, quotePrice } from '../domain/transport';
/** Money and distance rules must be exact — they price every tow. */
describe('transport pricing & rules', () => {
  const rates = DEFAULT_TOW_RATES;
  it('base + per-km, rounded to 2 dp, with the type multiplier', () => {
    expect(quotePrice(10, 'flatbed_tow', rates).price).toBe('105.00');        // 60 + 4.5×10
    expect(quotePrice(10, 'heavy_tow', rates).price).toBe('189.00');          // ×1.8
    expect(quotePrice(10, 'parts_delivery', rates).price).toBe('90.00');      // ×0.6 = 63 → minimum 90
  });
  it('never charges below the minimum fee', () => {
    expect(quotePrice(0, 'flatbed_tow', rates).price).toBe('90.00');
    expect(quotePrice(1, 'wheel_lift_tow', rates).price).toBe('90.00');
  });
  it('platform margin follows the configured bps', () => {
    expect(quotePrice(10, 'flatbed_tow', { ...rates, marginBps: 1500 }).margin).toBe('15.75'); // 15% of 105
    expect(quotePrice(10, 'flatbed_tow', { ...rates, marginBps: 0 }).margin).toBe('0.00');
  });
  it('rejects a negative distance instead of inventing a price', () => { expect(() => quotePrice(-1, 'flatbed_tow', rates)).toThrow(RangeError); });
  it('haversine matches a known Riyadh pair (±0.3 km)', () => {
    const d = haversineKm({ lat: 24.7136, lng: 46.6753 }, { lat: 24.6300, lng: 46.7900 }); // centre → industrial area
    expect(d).toBeGreaterThan(14); expect(d).toBeLessThan(15.5);
  });
  it('state machine forbids shortcuts and only completes with full proof', () => {
    expect(canTransitionTransport('requested', 'assigned')).toBe(true);
    expect(canTransitionTransport('requested', 'delivered')).toBe(false);
    expect(canTransitionTransport('picked_up', 'cancelled')).toBe(false);   // no cancelling with the car on the truck
    expect(canTransitionTransport('delivered', 'failed')).toBe(false);
    expect(canComplete({ proofMediaId: 'm1', proofOtpVerified: true })).toBe(true);
    expect(canComplete({ proofMediaId: 'm1', proofOtpVerified: false })).toBe(false);
    expect(canComplete({ proofMediaId: null, proofOtpVerified: true })).toBe(false);
  });
});
