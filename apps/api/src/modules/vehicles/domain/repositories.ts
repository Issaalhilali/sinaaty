import type { FuelType, VehicleEventType, VehicleOwnerType } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { Vehicle, VehicleEvent } from './vehicle';

export interface VehicleRepository {
  create(input: { vin?: string; plateAr?: string; plateEn?: string; makeId?: number; modelId?: number; modelYear?: number; trim?: string; engine?: string; fuelType?: FuelType; colorAr?: string; odometerKm?: number; ownerType: VehicleOwnerType; ownerUserId?: string; ownerOrgId?: string; fleetAssetCode?: string; vinDecoded?: unknown }): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByVin(vin: string): Promise<Vehicle | null>;
  /** نفس اللوحة عند نفس المالك — من لا يرى سيارته يُضيفها ثانيةً، فتتكرّر بصمت. */
  findByPlateForOwner(plateAr: string, owner: { userId?: string; orgId?: string }): Promise<Vehicle | null>;
  listByOwner(owner: { userId?: string; orgId?: string }): Promise<Vehicle[]>;
  /** نبض كل سيارةٍ في المجموعة: آخر صيانة مُسلَّمة، وكم ضماناً سارياً، وهل فيها إصلاح مفتوح —
   *  ما تحتاجه بطاقة «سيارتي» الحيّة على الشاشة الرئيسية، دفعةً واحدة لا سؤالاً لكل سيارة. */
  vitalsByVehicles(vehicleIds: string[]): Promise<Map<string, { lastServiceAt: Date | null; lastServiceTitleAr: string | null; activeWarranties: number; openWorkOrderId: string | null }>>;
  updateOdometer(id: string, km: number, tx?: TxHandle): Promise<void>;
  setPassportToken(id: string, token: string | null): Promise<void>;
  findByPassportToken(token: string): Promise<Vehicle | null>;
  /** Resolve or create make/model rows by English names (from the VIN decoder). */
  ensureMakeModel(makeEn: string, makeAr: string | undefined, modelEn?: string): Promise<{ makeId: number; modelId: number | null }>;
}
export interface VehicleEventRepository {
  add(ev: { vehicleId: string; type: VehicleEventType; occurredAt: Date; odometerKm?: number | null; orgId?: string | null; refTable?: string | null; refId?: string | null; summaryAr: string; summaryEn?: string | null; data?: unknown; isPublic?: boolean }, tx?: TxHandle): Promise<{ id: string }>;
  list(vehicleId: string, opts?: { publicOnly?: boolean; limit?: number }): Promise<VehicleEvent[]>;
}
export const VEHICLE_REPOSITORY = Symbol('VEHICLE_REPOSITORY');
export const VEHICLE_EVENT_REPOSITORY = Symbol('VEHICLE_EVENT_REPOSITORY');
