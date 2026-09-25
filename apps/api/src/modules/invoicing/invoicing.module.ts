import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { INVOICE_REPOSITORY, ZATCA_REPOSITORY } from './domain/repositories';
import { AppConfig } from '../../config';
import { ZatcaService } from './application/zatca.service';
import { ZATCA_PORT } from './application/ports/zatca.port';
import { ZatcaMockAdapter } from './infrastructure/zatca/zatca.mock.adapter';
import { ZatcaHttpAdapter } from './infrastructure/zatca/zatca.sandbox.adapter';
import { ZatcaPrismaRepository } from './infrastructure/prisma/zatca.prisma-repository';
import { ZatcaController } from './interface/http/zatca.controller';
import { ZatcaHandlers } from './application/handlers/zatca.handlers';
import { IntegrationsModule } from '../integrations/integrations.module';
import { INVOICE_RENDERER_PORT } from './application/ports/invoice-renderer.port';
import { InvoicesUseCases } from './application/use-cases/invoices.use-cases';
import { InvoicePrismaRepository } from './infrastructure/prisma/invoice.prisma-repository';
import { HtmlInvoiceRenderer } from './infrastructure/render/html-invoice.renderer';
import { InvoicesController } from './interface/http/invoices.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule, WorkOrdersModule, IntegrationsModule],
  controllers: [InvoicesController, ZatcaController],
  providers: [
    { provide: ZATCA_REPOSITORY, useClass: ZatcaPrismaRepository }, ZatcaService, ZatcaHandlers, ZatcaMockAdapter, ZatcaHttpAdapter,
    // Provider selection by env: mock in dev/test, the HTTP adapter for sandbox/live (CLAUDE.md §5.3).
    { provide: ZATCA_PORT, inject: [AppConfig, ZatcaMockAdapter, ZatcaHttpAdapter], useFactory: (c: AppConfig, mock: ZatcaMockAdapter, http: ZatcaHttpAdapter) => (c.get('INTEGRATION_ZATCA') === 'mock' ? mock : http) },InvoicesUseCases, { provide: INVOICE_REPOSITORY, useClass: InvoicePrismaRepository }, { provide: INVOICE_RENDERER_PORT, useClass: HtmlInvoiceRenderer }],
  exports: [INVOICE_REPOSITORY, ZATCA_REPOSITORY, InvoicesUseCases, ZatcaService],
})
export class InvoicingModule {}
