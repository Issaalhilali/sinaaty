import { Module } from '@nestjs/common';
import { AppConfig } from '../../config';
import { IdentityModule } from '../identity/identity.module';
import { VEHICLE_EVENT_REPOSITORY, VEHICLE_REPOSITORY } from './domain/repositories';
import { VIN_DECODER_PORT } from './application/ports/vin-decoder.port';
import { VehicleEventsWriter } from './application/vehicle-events.writer';
import { VehiclesUseCases } from './application/use-cases/vehicles.use-cases';
import { VehiclePrismaRepository } from './infrastructure/prisma/vehicle.prisma-repository';
import { VehicleEventPrismaRepository } from './infrastructure/prisma/vehicle-event.prisma-repository';
import { VinDecoderMockAdapter } from './infrastructure/vin/vin-decoder.mock.adapter';
import { VehiclesController } from './interface/http/vehicles.controller';

@Module({
  imports: [IdentityModule],
  controllers: [VehiclesController],
  providers: [
    VehiclesUseCases, VehicleEventsWriter, VinDecoderMockAdapter,
    { provide: VEHICLE_REPOSITORY, useClass: VehiclePrismaRepository },
    { provide: VEHICLE_EVENT_REPOSITORY, useClass: VehicleEventPrismaRepository },
    { provide: VIN_DECODER_PORT, inject: [AppConfig, VinDecoderMockAdapter], useFactory: (c: AppConfig, mock: VinDecoderMockAdapter) => { if (c.get('INTEGRATION_VIN') !== 'mock') throw new Error('VIN decoder live adapter not implemented — set INTEGRATION_VIN=mock'); return mock; } },
  ],
  exports: [VehicleEventsWriter, VEHICLE_REPOSITORY],
})
export class VehiclesModule {}
