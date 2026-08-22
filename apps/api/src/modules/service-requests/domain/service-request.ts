/**
 * سوق طلبات الإصلاح — the customer posts the problem, nearby workshops answer (owner directive
 * 2026-08-22). Pure domain: entities, the offer-comparison logic, and the access rules.
 */
export type ServiceRequestStatus = 'open' | 'accepted' | 'cancelled' | 'expired';
export type OfferStatus = 'submitted' | 'withdrawn' | 'accepted' | 'lost';
export type OfferType = 'estimate' | 'free_inspection';
export type Availability = 'now' | 'today' | 'scheduled';

export interface ServiceRequest {
  id: string; number: string; customerUserId: string; vehicleId: string | null;
  titleAr: string; descriptionAr: string | null;
  lat: number; lng: number; addressHint: string | null; radiusKm: number;
  preferredTime: 'now' | 'today' | 'this_week'; status: ServiceRequestStatus;
  acceptedOfferId: string | null; workOrderId: string | null; expiresAt: Date; createdAt: Date;
}

export interface ServiceOffer {
  id: string; requestId: string; orgId: string; offerType: OfferType;
  diagnosisAr: string | null; priceMin: string | null; priceMax: string | null;
  availability: Availability; availableAt: Date | null; etaNoteAr: string | null;
  status: OfferStatus; createdBy: string | null; createdAt: Date; updatedAt: Date;
}

/** What the customer compares offers WITH — resolved by the repository, computed here. */
export interface OfferView extends ServiceOffer {
  orgNameAr: string; ratingAvg: string; ratingCount: number;
  city: string | null; district: string | null; distanceKm: number | null;
  /** «سبق تعاملك معها» — from THIS customer's own work-order history. */
  previouslyUsed: boolean;
}

const price = (o: OfferView) => (o.priceMin == null ? Number.POSITIVE_INFINITY : Number(o.priceMin));
const AVAIL_RANK: Record<Availability, number> = { now: 0, today: 1, scheduled: 2 };

/** Cheapest first among priced offers; free inspections ride on availability then distance. */
export function sortOffers(offers: OfferView[]): OfferView[] {
  return [...offers].sort((a, b) => price(a) - price(b) || AVAIL_RANK[a.availability] - AVAIL_RANK[b.availability] || (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

/** WHY an offer wins — the same honesty rule as the parts bid compare (Step 23). */
export function offerBadges(offers: OfferView[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const live = offers.filter((o) => o.status === 'submitted');
  if (!live.length) return out;
  const cheapest = live.filter((o) => o.priceMin != null).sort((a, b) => price(a) - price(b))[0];
  const fastest = [...live].sort((a, b) => AVAIL_RANK[a.availability] - AVAIL_RANK[b.availability] || (a.distanceKm ?? 999) - (b.distanceKm ?? 999))[0];
  const nearest = live.filter((o) => o.distanceKm != null).sort((a, b) => a.distanceKm! - b.distanceKm!)[0];
  const add = (id: string, b: string) => out.set(id, [...(out.get(id) ?? []), b]);
  if (cheapest) add(cheapest.id, 'الأرخص');
  if (fastest && fastest.availability !== 'scheduled') add(fastest.id, 'الأسرع');
  if (nearest) add(nearest.id, 'الأقرب');
  for (const o of live) { if (o.offerType === 'free_inspection') add(o.id, 'معاينة مجانية'); if (o.previouslyUsed) add(o.id, 'سبق تعاملك معها'); }
  return out;
}

/** «حي الصناعية — 4.2 كم» — the distance arrives from the API as ready text (scope doc). */
export function whereText(o: Pick<OfferView, 'city' | 'district' | 'distanceKm'>): string {
  const place = o.district ?? o.city ?? '';
  const dist = o.distanceKm == null ? '' : `${o.distanceKm.toFixed(1)} كم`;
  return [place, dist].filter(Boolean).join(' — ') || '—';
}

export const isRequestOpen = (r: Pick<ServiceRequest, 'status' | 'expiresAt'>, now = new Date()) => r.status === 'open' && r.expiresAt > now;
export const isRequester = (r: Pick<ServiceRequest, 'customerUserId'>, userId: string) => r.customerUserId === userId;
