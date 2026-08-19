import type { TransportStatus, TransportType } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { DriverProfile, GeoPoint, TrackingPoint, TransportJob } from './transport';
export interface TransportRepository {
  nextNumber(tx?: TxHandle): Promise<string>;
  create(j: { number: string; type: TransportType; requesterUserId: string | null; requesterOrgId: string | null; vehicleId: string | null; workOrderId: string | null; partOrderId: string | null; pickup: GeoPoint; pickupAddress: string | null; dropoff: GeoPoint; dropoffAddress: string | null; distanceKm: string; quotedPrice: string; platformMargin: string; scheduledAt: Date | null; notesAr: string | null }, tx?: TxHandle): Promise<TransportJob>;
  findById(id: string, tx?: TxHandle): Promise<TransportJob | null>;
  list(q: { requesterUserId?: string; requesterOrgId?: string; providerOrgId?: string; driverUserId?: string; status?: TransportStatus[]; limit: number }): Promise<TransportJob[]>;
  /** Open jobs a driver may take: no driver yet, within radius of the pickup point. */
  listOffers(near: GeoPoint, radiusKm: number, type: TransportType | undefined, limit: number): Promise<Array<TransportJob & { pickupDistanceKm: number | null }>>;
  update(id: string, p: Partial<{ status: TransportStatus; providerOrgId: string | null; driverUserId: string | null; finalPrice: string; assignedAt: Date; pickedUpAt: Date; deliveredAt: Date; proofMediaId: string; proofOtpVerified: boolean; notesAr: string }>, tx?: TxHandle): Promise<void>;
  addTracking(jobId: string, p: { geo: GeoPoint; speedKmh?: number | null; heading?: number | null; recordedAt?: Date }): Promise<void>;
  listTracking(jobId: string, limit: number): Promise<TrackingPoint[]>;
  lastTrackingAt(jobId: string): Promise<Date | null>;
  // drivers
  upsertDriver(d: { userId: string; orgId: string | null; truckPlate: string | null; truckType: TransportType | null }, tx?: TxHandle): Promise<DriverProfile>;
  findDriver(userId: string): Promise<DriverProfile | null>;
  setDriverOnline(userId: string, online: boolean, geo?: GeoPoint | null): Promise<void>;
  /** Online drivers near a point (PostGIS), nearest first. */
  driversNear(point: GeoPoint, radiusKm: number, type: TransportType | undefined, limit: number): Promise<Array<DriverProfile & { distanceKm: number | null }>>;
}
export const TRANSPORT_REPOSITORY = Symbol('TRANSPORT_REPOSITORY');
