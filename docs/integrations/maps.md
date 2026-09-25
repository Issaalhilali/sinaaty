# Maps / routing — assumed contract

Port: `apps/api/src/modules/logistics/application/ports/maps.port.ts`

```ts
route(from: GeoPoint, to: GeoPoint): Promise<{ distanceKm: number; durationMinutes: number; source: 'mock' | 'provider' }>
```

Selected by `INTEGRATION_MAPS=mock|live` (dev/test = `mock`; a live adapter must be written before flipping it).

## Mock adapter (today)
Straight-line (haversine) distance × **1.35** road factor, ETA at an average **38 km/h** city speed. Deterministic, so
pricing tests can assert exact numbers. Good enough for the pilot: the quote is what the customer accepts, and the
final price is frozen from that quote.

## What a live provider must return
- **Driving** distance in km and duration in minutes for the actual road route (not straight line).
- Traffic-aware duration if available; otherwise free-flow is acceptable — ETA is advisory, price depends on distance.
- Failure must throw; the caller has no silent fallback (a wrong distance is a wrong price).

## Not assumed
Geocoding, place search and turn-by-turn navigation are **not** part of this port. The apps send coordinates; the
driver app opens the device's own navigation app with the destination.

## Pricing (domain, not provider)
`quotePrice()` in `logistics/domain/transport.ts`: `max(minimum, (base + perKm × km) × typeMultiplier)`, margin in bps.
Rates default to base 60 / 4.5 per km / minimum 90, multipliers flatbed 1×, wheel-lift 0.9×, parts delivery 0.6×,
heavy 1.8×; the platform margin comes from `TRANSPORT_MARGIN_BPS`. Tuning these must not require a deploy — moving them
into `platform_settings` is tracked in docs/backlog.md.
