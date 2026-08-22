import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { OfferView, ServiceOffer, ServiceRequest, ServiceRequestStatus } from './service-request';

export interface ServiceRequestRepository {
  nextNumber(tx?: TxHandle): Promise<string>;                                  // SR-2026-000123 via next_number('SR')
  create(r: { number: string; customerUserId: string; vehicleId: string | null; titleAr: string; descriptionAr: string | null; lat: number; lng: number; addressHint: string | null; radiusKm: number; preferredTime: string; expiresAt: Date }, tx?: TxHandle): Promise<ServiceRequest>;
  findById(id: string, tx?: TxHandle): Promise<ServiceRequest | null>;
  listMine(customerUserId: string, limit: number): Promise<ServiceRequest[]>;
  /** Open, unexpired requests whose OWN radius covers one of the org's locations — the workshop inbox. */
  listNearbyForOrg(orgId: string, limit: number): Promise<Array<ServiceRequest & { distanceKm: number | null; myOfferId: string | null }>>;
  update(id: string, patch: Partial<{ status: ServiceRequestStatus; acceptedOfferId: string; workOrderId: string; radiusKm: number; expiresAt: Date }>, tx?: TxHandle): Promise<void>;
  expireDue(now: Date): Promise<number>;

  /** Active workshops within radiusKm of the request point (workshop/service_center/body_shop). */
  matchWorkshops(requestId: string, radiusKm: number, limit: number): Promise<Array<{ orgId: string; distanceKm: number | null }>>;
  addRecipients(requestId: string, rows: Array<{ orgId: string; distanceKm: number | null }>, tx?: TxHandle): Promise<number>;
  isRecipient(requestId: string, orgIds: string[]): Promise<boolean>;
  findRecipient(requestId: string, orgId: string): Promise<{ orgId: string; distanceKm: string | null } | null>;

  upsertOffer(o: { requestId: string; orgId: string; offerType: string; diagnosisAr: string | null; priceMin: string | null; priceMax: string | null; availability: string; availableAt: Date | null; etaNoteAr: string | null; createdBy: string }, tx?: TxHandle): Promise<ServiceOffer>;
  findOffer(id: string, tx?: TxHandle): Promise<ServiceOffer | null>;
  /** Offers joined with org name/rating/location, distance from the request point, and «سبق تعاملك معها». */
  listOfferViews(requestId: string): Promise<OfferView[]>;
  setOfferStatus(id: string, status: ServiceOffer['status'], tx?: TxHandle): Promise<void>;
  markOthersLost(requestId: string, acceptedOfferId: string, tx?: TxHandle): Promise<number>;

  linkMedia(requestId: string, mediaIds: string[], tx?: TxHandle): Promise<number>;
  listMediaIds(requestId: string): Promise<string[]>;
}
export const SERVICE_REQUEST_REPOSITORY = Symbol('SERVICE_REQUEST_REPOSITORY');
