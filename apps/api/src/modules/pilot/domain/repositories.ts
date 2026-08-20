import type { TxHandle } from '../../../common/ports/unit-of-work.port';

export interface AnalyticsEventInput {
  event: string;
  orgId?: string | null;
  actorUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  industrialZone?: string | null;
  occurredAt?: Date;
  props?: Record<string, unknown>;
}

export interface FunnelRow { event: string; count: number; orgs: number }
export interface ZoneRow { zone: string | null; orgs: number; workOrders: number; paidInvoices: number; gmv: string }

export interface PilotRepository {
  /** Idempotent per (event, entity): an outbox replay must not double-count a funnel step. */
  record(e: AnalyticsEventInput, tx?: TxHandle): Promise<void>;
  funnel(q: { from: Date; to: Date; zone?: string; orgId?: string }): Promise<FunnelRow[]>;
  byZone(q: { from: Date; to: Date }): Promise<ZoneRow[]>;
  /** Activation: which pilot organizations actually used the product in the window. */
  activation(q: { from: Date; to: Date; zone?: string }): Promise<Array<{ orgId: string; nameAr: string; zone: string | null; workOrders: number; lastActiveAt: Date | null }>>;
  settings(prefix: string): Promise<Array<{ key: string; value: unknown }>>;
  setSetting(key: string, value: unknown, updatedBy: string): Promise<void>;
  /** Zone of an organization's primary location (denormalised into every analytics row). */
  zoneOfOrg(orgId: string): Promise<string | null>;
  orgTypeOf(orgId: string): Promise<string | null>;
  setLocationZone(locationId: string, zone: string | null): Promise<void>;
  /** Locations with no zone, or with a zone that is not one of `knownCodes` (legacy free text). */
  locationsMissingZone(limit: number, knownCodes: string[]): Promise<Array<{ id: string; orgId: string; lat: number; lng: number }>>;
}
export const PILOT_REPOSITORY = Symbol('PILOT_REPOSITORY');
