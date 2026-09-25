import type { TransportStatus, TransportType } from '@sinaaty/shared-types';
export interface GeoPoint { lat: number; lng: number }
export interface TransportJob {
  id: string; number: string; type: TransportType; status: TransportStatus;
  requesterUserId: string | null; requesterOrgId: string | null; providerOrgId: string | null; driverUserId: string | null;
  vehicleId: string | null; workOrderId: string | null; partOrderId: string | null;
  pickup: GeoPoint; pickupAddress: string | null; dropoff: GeoPoint; dropoffAddress: string | null;
  distanceKm: string | null; quotedPrice: string | null; finalPrice: string | null; platformMargin: string;
  scheduledAt: Date | null; assignedAt: Date | null; pickedUpAt: Date | null; deliveredAt: Date | null;
  proofMediaId: string | null; proofOtpVerified: boolean; notesAr: string | null; createdAt: Date;
}
export interface DriverProfile { userId: string; orgId: string | null; truckPlate: string | null; truckType: TransportType | null; isOnline: boolean; lastGeo: GeoPoint | null; lastGeoAt: Date | null; ratingAvg: string; fullNameAr?: string | null; phone?: string | null }
export interface TrackingPoint { geo: GeoPoint; speedKmh: string | null; heading: number | null; recordedAt: Date }

/** The driver drives this forward; only `requested`/`assigned` can still be cancelled by the requester. */
export const TRANSPORT_TRANSITIONS: Record<TransportStatus, TransportStatus[]> = {
  requested: ['assigned', 'cancelled'],
  assigned: ['en_route_pickup', 'cancelled', 'failed'],
  en_route_pickup: ['picked_up', 'failed'],
  picked_up: ['en_route_dropoff', 'failed'],
  en_route_dropoff: ['delivered', 'failed'],
  delivered: [], cancelled: [], failed: [],
};
export const canTransitionTransport = (f: TransportStatus, t: TransportStatus) => TRANSPORT_TRANSITIONS[f].includes(t);
export const ACTIVE_TRANSPORT: TransportStatus[] = ['requested', 'assigned', 'en_route_pickup', 'picked_up', 'en_route_dropoff'];
/** Delivery is only real with proof: a photo AND the receiver's OTP. */
export const canComplete = (j: Pick<TransportJob, 'proofMediaId' | 'proofOtpVerified'>) => !!j.proofMediaId && j.proofOtpVerified;

/** Pricing: base + per-km, with a minimum; heavy/flatbed cost more. Rates come from platform_settings, never hardcoded. */
export interface TowRates { baseFee: number; perKm: number; minimumFee: number; typeMultiplier: Record<string, number>; marginBps: number }
export const DEFAULT_TOW_RATES: TowRates = { baseFee: 60, perKm: 4.5, minimumFee: 90, typeMultiplier: { flatbed_tow: 1, wheel_lift_tow: 0.9, parts_delivery: 0.6, heavy_tow: 1.8 }, marginBps: 1500 };
export function quotePrice(distanceKm: number, type: TransportType, rates: TowRates): { price: string; margin: string } {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new RangeError('distance must be ≥ 0');
  const mult = rates.typeMultiplier[type] ?? 1;
  const raw = (rates.baseFee + rates.perKm * distanceKm) * mult;
  const price = Math.max(raw, rates.minimumFee);
  const rounded = Math.round(price * 100) / 100;
  return { price: rounded.toFixed(2), margin: ((rounded * rates.marginBps) / 10_000).toFixed(2) };
}
/** Straight-line fallback when no maps provider is configured (mock adapter uses it). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
}
