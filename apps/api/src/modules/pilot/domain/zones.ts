/**
 * Industrial zones (المناطق الصناعية) — the unit the pilot is measured in. A workshop belongs to a zone,
 * a group buy is offered to a zone, and the pilot dashboard reports per zone.
 *
 * The list is configuration (`platform_settings.pilot.industrial_zones`), not code: ops add a zone when
 * the pilot expands, without a deploy (CLAUDE.md §5.7).
 */
export interface IndustrialZone {
  code: string;
  nameAr: string;
  city: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

/** Riyadh first — the pilot city. Seeded into platform_settings; ops edit from the back-office. */
export const DEFAULT_ZONES: IndustrialZone[] = [
  { code: 'RUH-IND-1', nameAr: 'المدينة الصناعية الأولى — الرياض', city: 'الرياض', lat: 24.6408, lng: 46.7728, radiusKm: 6 },
  { code: 'RUH-IND-2', nameAr: 'المدينة الصناعية الثانية — الرياض', city: 'الرياض', lat: 24.5741, lng: 46.8347, radiusKm: 8 },
  { code: 'RUH-SULAY', nameAr: 'السلي — الرياض', city: 'الرياض', lat: 24.6167, lng: 46.8333, radiusKm: 5 },
  { code: 'RUH-NASEEM', nameAr: 'ورش النسيم — الرياض', city: 'الرياض', lat: 24.7333, lng: 46.8500, radiusKm: 4 },
  { code: 'JED-IND-1', nameAr: 'المدينة الصناعية الأولى — جدة', city: 'جدة', lat: 21.4114, lng: 39.2200, radiusKm: 7 },
];

const EARTH_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. Same formula the maps mock uses — good enough to place a workshop in a zone. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The zone a point belongs to: the nearest zone whose radius contains it. Returns null outside every zone —
 * a workshop outside the pilot zones is a normal workshop, not an error.
 */
export function zoneFor(point: { lat: number; lng: number }, zones: IndustrialZone[]): IndustrialZone | null {
  let best: { zone: IndustrialZone; d: number } | null = null;
  for (const zone of zones) {
    const d = distanceKm(point, zone);
    if (d <= zone.radiusKm && (best === null || d < best.d)) best = { zone, d };
  }
  return best?.zone ?? null;
}
