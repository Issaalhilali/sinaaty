import { Inject, Injectable } from '@nestjs/common';
import type { VehicleEventType } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import { VEHICLE_EVENT_REPOSITORY, type VehicleEventRepository, VEHICLE_REPOSITORY, type VehicleRepository } from '../domain/repositories';

export interface CarPassportEvent { vehicleId: string; type: VehicleEventType; occurredAt?: Date; odometerKm?: number | null; orgId?: string | null; refTable?: string | null; refId?: string | null; summaryAr: string; summaryEn?: string | null; data?: unknown; isPublic?: boolean }

/** Cross-module application service: work-orders / parts / warranties call this inside their tx. */
@Injectable()
export class VehicleEventsWriter {
  constructor(@Inject(VEHICLE_EVENT_REPOSITORY) private readonly events: VehicleEventRepository, @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository) {}
  async record(ev: CarPassportEvent, tx?: TxHandle): Promise<{ id: string }> {
    const r = await this.events.add({ ...ev, occurredAt: ev.occurredAt ?? new Date(), isPublic: ev.isPublic ?? true }, tx);
    if (ev.odometerKm != null) await this.vehicles.updateOdometer(ev.vehicleId, ev.odometerKm, tx);
    return r;
  }
}
