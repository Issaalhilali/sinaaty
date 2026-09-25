import { Module } from '@nestjs/common';
import { AppConfig } from '../../config';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { NOTE_REPOSITORY } from './domain/repositories';
import { NAFEZ_PORT } from './application/ports/nafez.port';
import { SETTLEMENT_RENDERER_PORT } from './application/ports/settlement-renderer.port';
import { NotesService } from './application/notes.service';
import { NoteOutboxHandlers } from './application/handlers/note.handlers';
import { NotesUseCases } from './application/use-cases/notes.use-cases';
import { NotePrismaRepository } from './infrastructure/prisma/note.prisma-repository';
import { NafezMockAdapter } from './infrastructure/nafez/nafez.mock.adapter';
import { HtmlSettlementRenderer } from './infrastructure/render/html-settlement.renderer';
import { AdminNotesController, NotesController } from './interface/http/notes.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule, VehiclesModule, WorkOrdersModule, InvoicingModule],
  controllers: [NotesController, AdminNotesController],
  providers: [NotesService, NotesUseCases, NoteOutboxHandlers, NafezMockAdapter, { provide: NOTE_REPOSITORY, useClass: NotePrismaRepository }, { provide: SETTLEMENT_RENDERER_PORT, useClass: HtmlSettlementRenderer },
    { provide: NAFEZ_PORT, inject: [AppConfig, NafezMockAdapter], useFactory: (c: AppConfig, mock: NafezMockAdapter) => { if (c.get('INTEGRATION_NAFEZ') !== 'mock') throw new Error('Nafez live adapter not implemented — set INTEGRATION_NAFEZ=mock'); return mock; } }],
  exports: [NotesService, NOTE_REPOSITORY],
})
export class PromissoryNotesModule {}
