import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { INVOICE_REPOSITORY } from './domain/repositories';
import { INVOICE_RENDERER_PORT } from './application/ports/invoice-renderer.port';
import { InvoicesUseCases } from './application/use-cases/invoices.use-cases';
import { InvoicePrismaRepository } from './infrastructure/prisma/invoice.prisma-repository';
import { HtmlInvoiceRenderer } from './infrastructure/render/html-invoice.renderer';
import { InvoicesController } from './interface/http/invoices.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule, WorkOrdersModule],
  controllers: [InvoicesController],
  providers: [InvoicesUseCases, { provide: INVOICE_REPOSITORY, useClass: InvoicePrismaRepository }, { provide: INVOICE_RENDERER_PORT, useClass: HtmlInvoiceRenderer }],
  exports: [INVOICE_REPOSITORY, InvoicesUseCases],
})
export class InvoicingModule {}
