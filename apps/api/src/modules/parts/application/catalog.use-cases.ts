import { Inject, Injectable } from '@nestjs/common';
import type { PartCondition } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { VIN_DECODER_PORT, type VinDecoderPort } from '../../vehicles/application/ports/vin-decoder.port';
import { VEHICLE_REPOSITORY, type VehicleRepository } from '../../vehicles/domain/repositories';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import type { CatalogPart, InventoryItem } from '../domain/parts';
import { SUPPLIER_ORG_TYPES, yearFits } from '../domain/parts';
import { PARTS_REPOSITORY, type PartsRepository } from '../domain/repositories';
import { parseCsv } from './csv';
import type { CatalogUpsertDto, CsvImportDto, InventoryUpsertDto } from './dto/parts.dto';

/** Distributor hub: brands/catalog/fitments, live inventory (upsert by external_sku, CSV sync runs) and VIN-fitment search with live offers. */
@Injectable()
export class CatalogUseCases {
  constructor(@Inject(PARTS_REPOSITORY) private readonly repo: PartsRepository, @Inject(VIN_DECODER_PORT) private readonly vin: VinDecoderPort, @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, private readonly audit: AuditLogWriter, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork) {}
  private mustSupplierMember(u: AuthUser, orgId: string) { if (isPlatformStaff(u)) return; const m = membership(u, orgId); if (!m) throw new AppError('FORBIDDEN'); }
  private async mustSupplierOrg(orgId: string) { const o = await this.orgs.findById(orgId); if (!o) throw new AppError('NOT_FOUND'); if (!(SUPPLIER_ORG_TYPES as readonly string[]).includes(o.type)) throw new AppError('FORBIDDEN', { messageAr: 'هذه المنشأة ليست مورّد قطع.', messageEn: 'Organization is not a parts supplier.' }); return o; }

  listBrands() { return this.repo.listBrands(); }
  private async brandId(name: string, orgId: string | null) { const b = await this.repo.findBrandByName(name); if (b) return b.id; return (await this.repo.createBrand({ nameAr: name, nameEn: name, isOem: false, agentOrgId: orgId })).id; }
  private async makeModel(make: string, model?: string | null) { return this.repo.ensureMakeModel(make, undefined, model ?? undefined); }
  async upsertCatalog(u: AuthUser, orgId: string, dto: CatalogUpsertDto): Promise<CatalogPart> {
    this.mustSupplierMember(u, orgId); await this.mustSupplierOrg(orgId);
    const brandId = await this.brandId(dto.brand, orgId); const category = dto.category_code ? await this.repo.findCategoryByCode(dto.category_code) : null;
    const part = await this.repo.upsertCatalog({ brandId, partNumber: dto.part_number.trim().toUpperCase(), nameAr: dto.name_ar, nameEn: dto.name_en, oemNumbers: dto.oem_numbers.map((x) => x.trim().toUpperCase()), categoryId: category?.id ?? null, isSerialized: dto.is_serialized, createdByOrgId: orgId });
    for (const f of dto.fitments) { const mm = await this.makeModel(f.make, f.model); await this.repo.upsertFitment({ catalogId: part.id, makeId: mm.makeId, modelId: mm.modelId, yearFrom: f.year_from ?? null, yearTo: f.year_to ?? null, engineCode: f.engine_code ?? null }); }
    return part;
  }
  /** CSV columns: brand,part_number,name_ar,name_en,oem_numbers(|-separated),category_code,make,model,year_from,year_to,engine_code,is_serialized */
  async importCatalogCsv(u: AuthUser, orgId: string, dto: CsvImportDto) {
    this.mustSupplierMember(u, orgId); await this.mustSupplierOrg(orgId);
    const rows = parseCsv(dto.csv); let ok = 0; const errors: Array<{ row: number; error: string }> = [];
    for (const [i, r] of rows.entries()) {
      try { if (!r['brand'] || !r['part_number'] || !r['name_ar']) throw new Error('brand, part_number, name_ar are required');
        await this.upsertCatalog(u, orgId, { brand: r['brand'], part_number: r['part_number'], name_ar: r['name_ar'], name_en: r['name_en'] || undefined, oem_numbers: (r['oem_numbers'] ?? '').split('|').map((x) => x.trim()).filter(Boolean), category_code: r['category_code'] || undefined, is_serialized: /^(1|true|yes)$/i.test(r['is_serialized'] ?? ''), fitments: r['make'] ? [{ make: r['make'], model: r['model'] || undefined, year_from: r['year_from'] ? Number(r['year_from']) : undefined, year_to: r['year_to'] ? Number(r['year_to']) : undefined, engine_code: r['engine_code'] || undefined }] : [] }); ok++; }
      catch (e) { errors.push({ row: i + 2, error: e instanceof Error ? e.message : String(e) }); }
    }
    return { rows_total: rows.length, rows_upserted: ok, rows_failed: errors.length, errors };
  }
  searchCatalog(q: { text?: string; part_number?: string; limit?: number }) { return this.repo.searchCatalog({ text: q.text, partNumber: q.part_number, limit: q.limit ?? 30 }); }

  async upsertInventory(u: AuthUser, orgId: string, dto: InventoryUpsertDto, syncedAt?: Date): Promise<InventoryItem> {
    this.mustSupplierMember(u, orgId); await this.mustSupplierOrg(orgId);
    const category = dto.category_code ? await this.repo.findCategoryByCode(dto.category_code) : null; const mm = dto.make ? await this.makeModel(dto.make, dto.model) : null;
    let catalogId = dto.catalog_id ?? null; if (!catalogId && dto.part_number) { const found = await this.repo.searchCatalog({ partNumber: dto.part_number, limit: 1 }); catalogId = found[0]?.id ?? null; }
    return this.repo.upsertInventory({ orgId, externalSku: dto.external_sku ?? null, catalogId, categoryId: category?.id ?? null, makeId: mm?.makeId ?? null, modelId: mm?.modelId ?? null, yearFrom: dto.year_from ?? null, yearTo: dto.year_to ?? null, partNumber: dto.part_number ?? null, condition: dto.condition as PartCondition, titleAr: dto.title_ar, price: dto.price ?? null, tradePrice: dto.trade_price ?? null, quantity: dto.quantity, donorVin: dto.donor_vin ?? null, warrantyDays: dto.warranty_days, leadTimeHours: dto.lead_time_hours ?? null, syncedAt: syncedAt ?? null });
  }
  /** CSV columns: external_sku,part_number,catalog_id,title_ar,condition,price,trade_price,quantity,warranty_days,lead_time_hours,make,model,year_from,year_to,category_code,donor_vin */
  async importInventoryCsv(u: AuthUser, orgId: string, dto: CsvImportDto) {
    this.mustSupplierMember(u, orgId); await this.mustSupplierOrg(orgId);
    const rows = parseCsv(dto.csv); const now = new Date(); let ok = 0; const errors: Array<{ row: number; error: string }> = [];
    for (const [i, r] of rows.entries()) {
      try { if (!r['title_ar'] || !r['condition']) throw new Error('title_ar and condition are required');
        await this.upsertInventory(u, orgId, { external_sku: r['external_sku'] || undefined, part_number: r['part_number'] || undefined, catalog_id: r['catalog_id'] || undefined, title_ar: r['title_ar'], condition: r['condition'], price: r['price'] || undefined, trade_price: r['trade_price'] || undefined, quantity: r['quantity'] ? Number(r['quantity']) : 1, warranty_days: r['warranty_days'] ? Number(r['warranty_days']) : 0, lead_time_hours: r['lead_time_hours'] ? Number(r['lead_time_hours']) : undefined, make: r['make'] || undefined, model: r['model'] || undefined, year_from: r['year_from'] ? Number(r['year_from']) : undefined, year_to: r['year_to'] ? Number(r['year_to']) : undefined, category_code: r['category_code'] || undefined, donor_vin: r['donor_vin'] || undefined }, now); ok++; }
      catch (e) { errors.push({ row: i + 2, error: e instanceof Error ? e.message : String(e) }); }
    }
    const run = await this.repo.createSyncRun({ orgId, source: 'csv', rowsTotal: rows.length, rowsUpserted: ok, rowsFailed: errors.length, errors });
    await this.uow.run((tx) => this.audit.write(tx, { action: 'inventory.sync', entityType: 'inventory_sync_run', entityId: run.id, orgId, actorUserId: u.id, after: { rows: rows.length, upserted: ok, failed: errors.length } }));
    return { sync_run_id: run.id, rows_total: rows.length, rows_upserted: ok, rows_failed: errors.length, errors };
  }
  async listInventory(u: AuthUser, orgId: string) { this.mustSupplierMember(u, orgId); return this.repo.listInventory({ orgId, limit: 500 }); }

  /** VIN → make/model/year → fitments → live offers (catalog matches + make/model/year matches for unlisted stock), sorted by price then lead time. */
  async fit(u: AuthUser, q: { vin?: string; vehicle_id?: string; category_code?: string; text?: string; buyer_org_id?: string }) {
    let makeId: number | null = null; let modelId: number | null = null; let year: number | null = null; let vehicle: { make: string | null; model: string | null; year: number | null } = { make: null, model: null, year: null };
    if (q.vehicle_id) { const v = await this.vehicles.findById(q.vehicle_id); if (!v) throw new AppError('NOT_FOUND'); makeId = v.makeId; modelId = v.modelId; year = v.modelYear; vehicle = { make: v.makeNameAr, model: v.modelNameAr, year: v.modelYear }; }
    else if (q.vin) { const d = await this.vin.decode(q.vin.toUpperCase()); if (d.makeEn) { const mm = await this.repo.ensureMakeModel(d.makeEn, d.makeAr ?? undefined, d.modelEn ?? undefined); makeId = mm.makeId; modelId = mm.modelId; } year = d.modelYear; vehicle = { make: d.makeAr ?? d.makeEn, model: d.modelEn, year: d.modelYear }; }
    else throw new AppError('VALIDATION', { messageAr: 'أدخل رقم الهيكل أو اختر السيارة.', messageEn: 'vin or vehicle_id is required.' });
    if (!makeId) return { vehicle, offers: [] };
    const category = q.category_code ? await this.repo.findCategoryByCode(q.category_code) : null;
    const fitments = await this.repo.fitmentsFor({ makeId, modelId, year }); const catalogIds = [...new Set(fitments.map((f) => f.catalogId))];
    const byCatalog = catalogIds.length ? await this.repo.listInventory({ catalogIds, activeOnly: true, limit: 300 }) : [];
    const byMake = await this.repo.listInventory({ makeId, activeOnly: true, limit: 300 });
    const seen = new Set<string>(); const items = [...byCatalog, ...byMake.filter((i) => (i.modelId == null || i.modelId === modelId) && yearFits(i.yearFrom, i.yearTo, year))].filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
    const catalogs = new Map<string, CatalogPart>(); for (const id of new Set(items.map((i) => i.catalogId).filter((x): x is string => !!x))) { const c = await this.repo.findCatalog(id); if (c) catalogs.set(id, c); }
    const byCategory = category ? items.filter((i) => i.categoryId === category.id || (i.catalogId && catalogs.get(i.catalogId)?.categoryId === category.id)) : items;
    const filtered = q.text ? byCategory.filter((i) => i.titleAr.includes(q.text!) || (i.partNumber ?? '').toUpperCase().includes(q.text!.toUpperCase())) : byCategory;
    const tradeSellers = new Map<string, { tradeAccountId: string; discountBps: number }>();
    if (q.buyer_org_id) for (const a of await this.repo.listTradeAccounts({ buyerOrgId: q.buyer_org_id, limit: 200 })) if (a.status === 'active') tradeSellers.set(a.sellerOrgId, { tradeAccountId: a.id, discountBps: a.discountBps });
    const orgNames = new Map<string, string>(); for (const id of new Set(filtered.map((i) => i.orgId))) { const o = await this.orgs.findById(id); orgNames.set(id, o?.tradeNameAr ?? o?.legalNameAr ?? ''); }
    const offers = filtered.map((i) => { const ta = tradeSellers.get(i.orgId); const c = i.catalogId ? catalogs.get(i.catalogId) : null; return { inventory_id: i.id, supplier_org_id: i.orgId, supplier_name_ar: orgNames.get(i.orgId), title_ar: i.titleAr, part_number: i.partNumber ?? c?.partNumber ?? null, brand_ar: c?.brandNameAr ?? null, condition: i.condition, price: i.price, trade_price: ta ? (i.tradePrice ?? i.price) : null, trade_account_id: ta?.tradeAccountId ?? null, quantity: i.quantity - i.reservedQty, warranty_days: i.warrantyDays, lead_time_hours: i.leadTimeHours, is_serialized: c?.isSerialized ?? false, fitment_source: i.catalogId && catalogIds.includes(i.catalogId) ? 'catalog' : 'listing' }; })
      .filter((o) => o.quantity > 0).sort((a, b) => Number(a.trade_price ?? a.price ?? 1e12) - Number(b.trade_price ?? b.price ?? 1e12) || (a.lead_time_hours ?? 1e9) - (b.lead_time_hours ?? 1e9));
    return { vehicle, offers };
  }
}
