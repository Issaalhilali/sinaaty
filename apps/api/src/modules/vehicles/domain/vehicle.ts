import type { FuelType, VehicleEventType, VehicleOwnerType } from '@sinaaty/shared-types';
export interface Vehicle {
  id: string; vin: string | null; plateNumber: string | null; plateNumberEn: string | null;
  makeId: number | null; modelId: number | null; makeNameAr: string | null; makeNameEn: string | null; modelNameAr: string | null; modelNameEn: string | null;
  modelYear: number | null; trim: string | null; engine: string | null; fuelType: FuelType | null; colorAr: string | null; odometerKm: number | null;
  ownerType: VehicleOwnerType; ownerUserId: string | null; ownerOrgId: string | null; fleetAssetCode: string | null;
  ownershipVerifiedAt: Date | null; passportPublicToken: string | null; createdAt: Date;
}
export interface VehicleEvent {
  id: string; vehicleId: string; type: VehicleEventType; occurredAt: Date; odometerKm: number | null; orgId: string | null; orgNameAr: string | null;
  refTable: string | null; refId: string | null; summaryAr: string; summaryEn: string | null; data: unknown; isPublic: boolean;
}
export function isOwner(v: Pick<Vehicle, 'ownerType' | 'ownerUserId' | 'ownerOrgId'>, user: { id: string; orgs: Array<{ orgId: string }> }): boolean {
  if (v.ownerType === 'user') return v.ownerUserId === user.id;
  return !!v.ownerOrgId && user.orgs.some((o) => o.orgId === v.ownerOrgId);
}
/** Public passport must never leak owner identity or plate. */
export function toPublicPassport(v: Vehicle, events: VehicleEvent[]) {
  return {
    vehicle: { vin_masked: v.vin ? `${v.vin.slice(0, 8)}*****${v.vin.slice(-4)}` : null, make_ar: v.makeNameAr, make_en: v.makeNameEn, model_ar: v.modelNameAr, model_en: v.modelNameEn, model_year: v.modelYear, fuel_type: v.fuelType, odometer_km: v.odometerKm },
    events: events.filter((e) => e.isPublic).map((e) => ({ type: e.type, occurred_at: e.occurredAt.toISOString(), odometer_km: e.odometerKm, org_name_ar: e.orgNameAr, summary_ar: e.summaryAr, summary_en: e.summaryEn })),
  };
}
