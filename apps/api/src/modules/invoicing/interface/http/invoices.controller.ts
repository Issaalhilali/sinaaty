import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { InvoiceStatus } from '@sinaaty/shared-types';
import { CreditNoteDto, IssueFromWorkOrderDto, VoidDto } from '../../application/dto/invoices.dto';
import { InvoicesUseCases } from '../../application/use-cases/invoices.use-cases';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, zod } from '../../../identity/interface/http';

@ApiTags('invoices') @ApiBearerAuth() @Controller('invoices')
export class InvoicesController {
  constructor(private readonly uc: InvoicesUseCases) {}
  @Post() @HttpCode(201) @ApiOperation({ summary: 'Issue the tax invoice for an approved, ready/delivered work order (ZATCA Phase 1: QR TLV, sequential per org)' })
  issue(@CurrentUser() u: AuthUser, @Body(zod(IssueFromWorkOrderDto)) dto: IssueFromWorkOrderDto) { return this.uc.issueFromWorkOrder(u, dto); }
  @Get() @ApiOperation({ summary: 'List: ?org_id= for the seller, otherwise my invoices' })
  list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('status') status?: string, @Query('limit') limit?: string) { return this.uc.list(u, { org_id: orgId, status: status ? (status.split(',') as InvoiceStatus[]) : undefined, limit: limit ? Number(limit) : undefined }); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }
  @Post(':id/void') @HttpCode(200) @ApiOperation({ summary: 'Void an unpaid invoice (paid → issue a credit note instead)' })
  void(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(VoidDto)) dto: VoidDto) { return this.uc.void(u, id, dto); }
  @Post(':id/credit-notes') @HttpCode(201) @ApiOperation({ summary: 'Issue a credit note (full or per-line partial) against this invoice' })
  creditNote(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(CreditNoteDto)) dto: CreditNoteDto) { return this.uc.creditNote(u, id, dto); }
  @Get(':id/xml') @Header('Cache-Control', 'private, max-age=60') @ApiOperation({ summary: 'UBL 2.1 XML (Phase 1 archival form; Phase 2 signing in Step 20)' })
  async xml(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) { res.setHeader('content-type', 'application/xml; charset=utf-8'); res.send(await this.uc.xml(u, id)); }
  @Get(':id/document') @Header('Cache-Control', 'private, max-age=60') @ApiOperation({ summary: 'Printable Arabic RTL invoice (PDF/A-3 in live; HTML in mock)' })
  async document(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) { const doc = await this.uc.document(u, id); res.setHeader('content-type', `${doc.mimeType}; charset=utf-8`); res.send(doc.bytes); }
}
