import type { BidStatus, PartCondition, PartOrderStatus, PartRequestStatus, PartSerialStatus, WarrantyStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { CatalogPart, Fitment, InventoryItem, PartBid, PartOrder, PartOrderItem, PartRequest, PartSerial, TradeAccount, Warranty } from './parts';

export interface PartsRepository {
  nextNumber(prefix: 'PR' | 'PO' | 'WR' | 'GB', tx?: TxHandle): Promise<string>;
  // catalog
  listBrands(): Promise<Array<{ id: number; nameAr: string; nameEn: string; isOem: boolean; agentOrgId: string | null }>>;
  findBrandByName(nameEn: string): Promise<{ id: number } | null>;
  createBrand(b: { nameAr: string; nameEn: string; isOem: boolean; agentOrgId?: string | null }): Promise<{ id: number }>;
  findCategoryByCode(code: string): Promise<{ id: number } | null>;
  upsertCatalog(p: { brandId: number; partNumber: string; nameAr: string; nameEn?: string | null; oemNumbers?: string[]; categoryId?: number | null; isSerialized?: boolean; createdByOrgId?: string | null }, tx?: TxHandle): Promise<CatalogPart>;
  findCatalog(id: string): Promise<CatalogPart | null>;
  searchCatalog(q: { text?: string; partNumber?: string; limit: number }): Promise<CatalogPart[]>;
  upsertFitment(f: { catalogId: string; makeId: number; modelId?: number | null; yearFrom?: number | null; yearTo?: number | null; engineCode?: string | null; source?: string }, tx?: TxHandle): Promise<Fitment>;
  fitmentsFor(v: { makeId: number; modelId: number | null; year: number | null }): Promise<Fitment[]>;
  ensureMakeModel(makeEn: string, makeAr: string | undefined, modelEn?: string): Promise<{ makeId: number; modelId: number | null }>;
  // inventory
  upsertInventory(i: { orgId: string; externalSku?: string | null; catalogId?: string | null; categoryId?: number | null; makeId?: number | null; modelId?: number | null; yearFrom?: number | null; yearTo?: number | null; partNumber?: string | null; condition: PartCondition; titleAr: string; price?: string | null; tradePrice?: string | null; quantity: number; donorVin?: string | null; warrantyDays?: number; leadTimeHours?: number | null; syncedAt?: Date | null }, tx?: TxHandle): Promise<InventoryItem>;
  findInventory(id: string, tx?: TxHandle): Promise<InventoryItem | null>;
  listInventory(q: { orgId?: string; catalogIds?: string[]; makeId?: number; modelId?: number | null; categoryId?: number; activeOnly?: boolean; limit: number }): Promise<InventoryItem[]>;
  adjustInventory(id: string, delta: { quantity?: number; reserved?: number }, tx?: TxHandle): Promise<void>;
  createSyncRun(r: { orgId: string; source: string; rowsTotal: number; rowsUpserted: number; rowsFailed: number; errors: unknown }): Promise<{ id: string }>;
  // requests & bids
  createRequest(r: Omit<PartRequest, 'id' | 'status' | 'awardedBidId' | 'createdAt'> & { deliverTo?: { lat: number; lng: number } | null }, tx?: TxHandle): Promise<PartRequest>;
  findRequest(id: string, tx?: TxHandle): Promise<PartRequest | null>;
  listRequests(q: { requesterUserId?: string; requesterOrgId?: string; recipientOrgId?: string; status?: PartRequestStatus[]; endedBefore?: Date; limit: number }): Promise<PartRequest[]>;
  updateRequest(id: string, p: { status?: PartRequestStatus; awardedBidId?: string | null }, tx?: TxHandle): Promise<void>;
  /** Supplier orgs (active, supplier types) with a location within the radius of the request point; distance in km. */
  matchSuppliers(requestId: string, radiusKm: number, limit: number): Promise<Array<{ orgId: string; distanceKm: number | null }>>;
  addRecipients(requestId: string, rows: Array<{ orgId: string; distanceKm: number | null }>, tx?: TxHandle): Promise<number>;
  listRecipients(requestId: string): Promise<Array<{ orgId: string; distanceKm: number | null; notifiedAt: Date; viewedAt: Date | null }>>;
  upsertBid(b: Omit<PartBid, 'id' | 'status' | 'createdAt' | 'updatedAt'>, tx?: TxHandle): Promise<PartBid>;
  findBid(id: string, tx?: TxHandle): Promise<PartBid | null>;
  listBids(requestId: string): Promise<PartBid[]>;
  setBidStatus(id: string, status: BidStatus, tx?: TxHandle): Promise<void>;
  setBidsStatus(requestId: string, from: BidStatus[], to: BidStatus, exceptId?: string, tx?: TxHandle): Promise<number>;
  // orders
  createOrder(o: Omit<PartOrder, 'id' | 'shippedAt' | 'deliveredAt' | 'installedAt' | 'confirmedAt' | 'createdAt' | 'items'> & { items: Array<Omit<PartOrderItem, 'id'>> }, tx?: TxHandle): Promise<PartOrder>;
  findOrder(id: string, tx?: TxHandle): Promise<PartOrder | null>;
  findOrderByInvoice(invoiceId: string): Promise<PartOrder | null>;
  listOrders(q: { buyerUserId?: string; buyerOrgId?: string; supplierOrgId?: string; tradeAccountId?: string; status?: PartOrderStatus[]; autoConfirmBefore?: Date; limit: number }): Promise<PartOrder[]>;
  updateOrder(id: string, p: { status?: PartOrderStatus; shippedAt?: Date; deliveredAt?: Date; installedAt?: Date; confirmedAt?: Date; autoConfirmAt?: Date | null; cancelledAt?: Date; transportJobId?: string }, tx?: TxHandle): Promise<void>;
  linkInvoice(orderId: string, invoiceId: string, tx?: TxHandle): Promise<void>;
  // trade accounts
  createTradeAccount(a: { sellerOrgId: string; buyerOrgId: string; paymentTermsDays?: number }, tx?: TxHandle): Promise<TradeAccount>;
  findTradeAccount(id: string, tx?: TxHandle): Promise<TradeAccount | null>;
  findTradeAccountPair(sellerOrgId: string, buyerOrgId: string, tx?: TxHandle): Promise<TradeAccount | null>;
  listTradeAccounts(q: { sellerOrgId?: string; buyerOrgId?: string; limit: number }): Promise<TradeAccount[]>;
  updateTradeAccount(id: string, p: { status?: TradeAccount['status']; creditLimit?: string; paymentTermsDays?: number; discountBps?: number; approvedBy?: string; approvedAt?: Date; outstandingDelta?: string }, tx?: TxHandle): Promise<void>;
  // serials
  createSerials(rows: Array<{ catalogId: string; serialNumber: string; qrToken: string; batchCode: string | null; issuerOrgId: string; ownerOrgId: string | null }>, tx?: TxHandle): Promise<number>;
  findSerialByToken(qrToken: string, tx?: TxHandle): Promise<PartSerial | null>;
  findSerial(id: string, tx?: TxHandle): Promise<PartSerial | null>;
  listSerials(q: { issuerOrgId?: string; ownerOrgId?: string; catalogId?: string; status?: PartSerialStatus[]; batchCode?: string; limit: number }): Promise<PartSerial[]>;
  updateSerial(id: string, p: { status?: PartSerialStatus; ownerOrgId?: string | null; partOrderId?: string | null; workOrderItemId?: string | null; vehicleId?: string | null; installedAt?: Date; bumpScan?: boolean }, tx?: TxHandle): Promise<void>;
  // warranties
  createWarranty(w: Omit<Warranty, 'id' | 'status'>, tx?: TxHandle): Promise<Warranty>;
  findWarranty(id: string): Promise<Warranty | null>;
  findWarrantyByToken(qrToken: string): Promise<Warranty | null>;
  listWarranties(q: { beneficiaryUserId?: string; beneficiaryOrgId?: string; vehicleId?: string; issuerOrgId?: string; limit: number }): Promise<Warranty[]>;
  updateWarranty(id: string, p: { status?: WarrantyStatus }, tx?: TxHandle): Promise<void>;
  createClaim(c: { warrantyId: string; claimantUserId: string | null; descriptionAr: string }, tx?: TxHandle): Promise<{ id: string }>;
  listClaims(warrantyId: string): Promise<Array<{ id: string; status: string; descriptionAr: string; resolutionAr: string | null; createdAt: Date }>>;
  updateClaim(id: string, p: { status: string; resolutionAr?: string; resolvedBy?: string; resolvedAt?: Date }, tx?: TxHandle): Promise<void>;
  // group buys (minimal)
  createGroupBuy(g: { number: string; supplierOrgId: string; catalogId: string; industrialZone: string | null; unitPrice: string; minQuantity: number; closesAt: Date }): Promise<{ id: string; number: string }>;
  findGroupBuy(id: string, tx?: TxHandle): Promise<{ id: string; number: string; supplierOrgId: string; catalogId: string; unitPrice: string; minQuantity: number; committedQty: number; closesAt: Date; status: string } | null>;
  updateGroupBuy(id: string, p: { committedDelta?: number; status?: string }, tx?: TxHandle): Promise<void>;
  // WO item link (part installed) — reads work_order_items minimal fields
  findWorkOrderItem(itemId: string): Promise<{ id: string; workOrderId: string; vehicleId: string; orgId: string; customerUserId: string | null; customerOrgId: string | null } | null>;
}
export const PARTS_REPOSITORY = Symbol('PARTS_REPOSITORY');
