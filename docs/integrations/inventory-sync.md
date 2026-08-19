# Inventory sync (distributors) — assumed contract

Port: `POST /v1/parts/orgs/:orgId/inventory/import-csv` (push) today; `InventorySyncPort` REST pull adapter later.

CSV columns (header row, UTF-8, comma): `external_sku,part_number,catalog_id,title_ar,condition,price,trade_price,quantity,warranty_days,lead_time_hours,make,model,year_from,year_to,category_code,donor_vin`
- Upsert key: `(org_id, external_sku)`; rows without `external_sku` insert new listings.
- `part_number` resolves `catalog_id` automatically when the catalog row exists (brand/part_number or OEM number).
- `condition` ∈ `oem_new | aftermarket_new | used_scrapyard | refurbished`; `price` = retail (Buy Now), `trade_price` = workshops on an active trade account.
- Every run writes `inventory_sync_runs` (rows total/upserted/failed + per-row errors) and an audit entry.

Catalog CSV: `brand,part_number,name_ar,name_en,oem_numbers(|-separated),category_code,make,model,year_from,year_to,engine_code,is_serialized` → `parts_catalog` + `part_fitments` (make/model/year range).
