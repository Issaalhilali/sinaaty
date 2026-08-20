import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PartOrderStatus } from '@sinaaty/shared-types';
import { CurrentUser, Public, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CatalogUseCases } from '../../application/catalog.use-cases';
import { MarketplaceUseCases } from '../../application/marketplace.use-cases';
import { OrdersUseCases } from '../../application/orders.use-cases';
import { SerialsUseCases } from '../../application/serials.use-cases';
import { TradeAccountsUseCases } from '../../application/trade-accounts.use-cases';
import { WarrantiesUseCases } from '../../application/warranties.use-cases';
import { AcceptBidDto, BidDto, BuyNowDto, CatalogUpsertDto, ClaimDto, ClaimResolveDto, CreateRequestDto, CsvImportDto, GroupBuyDto, GroupBuyJoinDto, InventoryUpsertDto, OrderTransitionDto, SerialBatchDto, SerialInstallDto, SerialTransferDto, TradeAccountApproveDto, TradeAccountRequestDto } from '../../application/dto/parts.dto';

@ApiTags('parts') @ApiBearerAuth() @Controller('parts')
export class PartsController {
  constructor(private readonly catalog: CatalogUseCases, private readonly market: MarketplaceUseCases, private readonly orders: OrdersUseCases, private readonly serials: SerialsUseCases, private readonly trade: TradeAccountsUseCases, private readonly warranties: WarrantiesUseCases) {}
  // ---- catalog & inventory (distributor hub)
  @Get('brands') brands() { return this.catalog.listBrands(); }
  @Get('catalog') @ApiOperation({ summary: 'Search catalog by text or part/OEM number' }) search(@Query('q') q?: string, @Query('part_number') pn?: string) { return this.catalog.searchCatalog({ text: q, part_number: pn }); }
  @Post('orgs/:orgId/catalog') @HttpCode(201) upsertCatalog(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(CatalogUpsertDto)) dto: CatalogUpsertDto) { return this.catalog.upsertCatalog(u, orgId, dto); }
  @Post('orgs/:orgId/catalog/import-csv') @HttpCode(200) importCatalog(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(CsvImportDto)) dto: CsvImportDto) { return this.catalog.importCatalogCsv(u, orgId, dto); }
  @Get('orgs/:orgId/inventory') inventory(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.catalog.listInventory(u, orgId); }
  @Post('orgs/:orgId/inventory') @HttpCode(201) upsertInventory(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(InventoryUpsertDto)) dto: InventoryUpsertDto) { return this.catalog.upsertInventory(u, orgId, dto); }
  @Post('orgs/:orgId/inventory/import-csv') @HttpCode(200) @ApiOperation({ summary: 'InventorySync (CSV): upsert by external_sku, records inventory_sync_runs' }) importInventory(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(CsvImportDto)) dto: CsvImportDto) { return this.catalog.importInventoryCsv(u, orgId, dto); }
  @Get('fit') @ApiOperation({ summary: 'VIN-fitment search with live offers: ?vin= or ?vehicle_id= (+category_code, q, buyer_org_id for trade prices)' }) fit(@CurrentUser() u: AuthUser, @Query('vin') vin?: string, @Query('vehicle_id') vehicleId?: string, @Query('category_code') cat?: string, @Query('q') q?: string, @Query('buyer_org_id') buyer?: string) { return this.catalog.fit(u, { vin, vehicle_id: vehicleId, category_code: cat, text: q, buyer_org_id: buyer }); }
  // ---- reverse auction
  @Post('requests') @HttpCode(201) createRequest(@CurrentUser() u: AuthUser, @Body(zod(CreateRequestDto)) dto: CreateRequestDto) { return this.market.create(u, dto); }
  @Get('requests') listRequests(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('as') as?: 'requester' | 'supplier', @Query('status') status?: string) { return this.market.list(u, { org_id: orgId, as, status: status?.split(',') }); }
  @Get('requests/:id') getRequest(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.market.get(u, id); }
  @Post('requests/:id/bids') @HttpCode(200) @ApiOperation({ summary: 'Supplier bid (upsert — one live bid per supplier)' }) bid(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(BidDto)) dto: BidDto) { return this.market.bid(u, id, dto); }
  @Post('requests/:id/accept') @HttpCode(200) accept(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(AcceptBidDto)) dto: AcceptBidDto) { return this.market.accept(u, id, dto.bid_id, dto.payment_terms); }
  @Post('requests/:id/cancel') @HttpCode(200) cancelRequest(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.market.cancel(u, id); }
  // ---- orders
  @Post('orders/buy-now') @HttpCode(201) buyNow(@CurrentUser() u: AuthUser, @Body(zod(BuyNowDto)) dto: BuyNowDto) { return this.orders.buyNow(u, dto); }
  @Get('orders') listOrders(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('as') as?: 'buyer' | 'supplier', @Query('status') status?: string) { return this.orders.list(u, { org_id: orgId, as, status: status?.split(',') as PartOrderStatus[] | undefined }); }
  @Get('orders/:id') getOrder(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.orders.get(u, id); }
  @Post('orders/:id/transition') @HttpCode(200) transition(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(OrderTransitionDto)) dto: OrderTransitionDto) { return this.orders.transition(u, id, dto); }
  @Post('orders/:id/confirm') @HttpCode(200) @ApiOperation({ summary: 'Buyer confirms receipt → escrow released + warranties issued' }) confirm(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.orders.confirm(u, id); }
  // ---- trade accounts
  @Post('trade-accounts') @HttpCode(201) requestTa(@CurrentUser() u: AuthUser, @Body(zod(TradeAccountRequestDto)) dto: TradeAccountRequestDto) { return this.trade.request(u, dto); }
  @Get('trade-accounts') listTa(@CurrentUser() u: AuthUser, @Query('org_id') orgId: string, @Query('as') as: 'seller' | 'buyer') { return this.trade.list(u, { org_id: orgId, as: as ?? 'buyer' }); }
  @Get('trade-accounts/:id') getTa(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.trade.get(u, id); }
  @Post('trade-accounts/:id/approve') @HttpCode(200) approveTa(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(TradeAccountApproveDto)) dto: TradeAccountApproveDto) { return this.trade.approve(u, id, dto); }
  @Post('trade-accounts/:id/hold') @HttpCode(200) holdTa(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.trade.hold(u, id, true); }
  @Post('trade-accounts/:id/reactivate') @HttpCode(200) reactivateTa(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.trade.hold(u, id, false); }
  // ---- serials (anti-counterfeit)
  @Post('serials/batches') @HttpCode(201) issueSerials(@CurrentUser() u: AuthUser, @Body(zod(SerialBatchDto)) dto: SerialBatchDto) { return this.serials.issueBatch(u, dto); }
  @Get('orgs/:orgId/serials') listSerials(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Query('status') status?: string, @Query('batch') batch?: string) { return this.serials.listForOrg(u, orgId, { status: status?.split(','), batch }); }
  @Post('serials/transfer') @HttpCode(200) transferSerials(@CurrentUser() u: AuthUser, @Body(zod(SerialTransferDto)) dto: SerialTransferDto) { return this.serials.transfer(u, dto); }
  @Post('serials/install') @HttpCode(200) @ApiOperation({ summary: 'Workshop scans QR at install → part_and_labor warranty; duplicate install raises an alert' }) install(@CurrentUser() u: AuthUser, @Body(zod(SerialInstallDto)) dto: SerialInstallDto) { return this.serials.install(u, dto); }
  @Public() @Throttle({ default: { limit: 60, ttl: 60_000 } }) @Get('verify/:token') @ApiOperation({ summary: 'Public genuine-part check by QR token' }) verify(@Param('token') token: string) { return this.serials.verify(token); }
  // ---- warranties
  @Get('warranties') myWarranties(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string) { return this.warranties.mine(u, orgId); }
  @Get('orgs/:orgId/warranties') issuedWarranties(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.warranties.issued(u, orgId); }
  @Get('warranties/:id') getWarranty(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.warranties.get(u, id); }
  @Post('warranties/:id/claims') @HttpCode(201) claim(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ClaimDto)) dto: ClaimDto) { return this.warranties.claim(u, id, dto); }
  @Post('warranties/:id/claims/:claimId/resolve') @HttpCode(200) resolve(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('claimId') claimId: string, @Body(zod(ClaimResolveDto)) dto: ClaimResolveDto) { return this.warranties.resolveClaim(u, id, claimId, dto); }
  @Public() @Throttle({ default: { limit: 60, ttl: 60_000 } }) @Get('warranty-check/:token') warrantyCheck(@Param('token') token: string) { return this.warranties.publicByToken(token); }
  // ---- group buys
  @Post('group-buys') @HttpCode(201) openGb(@CurrentUser() u: AuthUser, @Body(zod(GroupBuyDto)) dto: GroupBuyDto) { return this.warranties.openGroupBuy(u, dto); }
  @Get('group-buys/:id') getGb(@Param('id') id: string) { return this.warranties.getGroupBuy(id); }
  @Post('group-buys/:id/join') @HttpCode(200) joinGb(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(GroupBuyJoinDto)) dto: GroupBuyJoinDto) { return this.warranties.joinGroupBuy(u, id, dto); }
}
