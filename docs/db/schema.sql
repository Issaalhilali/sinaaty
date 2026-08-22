-- =============================================================================
--  صناعتي (Sinaaty) — PostgreSQL 16 Schema  v1.0  (2026-08-17)
--  Conventions:
--    * snake_case, plural table names, UUID PKs (app generates UUIDv7; DB default gen_random_uuid()).
--    * All money = NUMERIC(14,2) SAR. All timestamps = timestamptz (UTC).
--    * Bilingual text: name_ar / name_en.
--    * Soft delete via deleted_at where legally allowed; legal/financial tables are append-only.
--    * Every table owned by exactly one module (see docs/02-ARCHITECTURE.md §3.2).
--  This file is the human-readable source of truth; Prisma migrations must stay equivalent.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid, encryption helpers
CREATE EXTENSION IF NOT EXISTS postgis;       -- geo matching (workshops, suppliers, tow trucks)
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy Arabic/English search
CREATE EXTENSION IF NOT EXISTS citext;        -- case-insensitive emails

-- -----------------------------------------------------------------------------
-- 0. ENUMS
-- -----------------------------------------------------------------------------
CREATE TYPE user_status          AS ENUM ('pending','active','suspended','deleted');
CREATE TYPE platform_role        AS ENUM ('none','support','ops','finance','compliance','super_admin');
CREATE TYPE identity_provider    AS ENUM ('nafath','otp_phone','email_password','apple','google');
CREATE TYPE org_type             AS ENUM ('workshop','factory','service_center','body_shop','parts_dealer','parts_distributor','parts_brand_agent','scrapyard','fleet_company','logistics','inspection_center');
-- parts_dealer = محل قطع تجزئة | parts_distributor = وكيل/موزّع جملة | parts_brand_agent = وكيل علامة قطع (Bosch/Denso…) أو موزّع القطع الأصلية للماركة
CREATE TYPE org_status           AS ENUM ('draft','pending_kyb','active','suspended','closed');
CREATE TYPE org_member_role      AS ENUM ('owner','manager','technician','accountant','driver','fleet_admin','fleet_approver','fleet_viewer');
CREATE TYPE kyb_doc_type         AS ENUM ('commercial_registration','vat_certificate','national_address','iban_letter','municipality_license','owner_id','other');
CREATE TYPE kyb_doc_status       AS ENUM ('pending','approved','rejected','expired');
CREATE TYPE subscription_status  AS ENUM ('trialing','active','past_due','cancelled','expired');
CREATE TYPE vehicle_owner_type   AS ENUM ('user','organization');
CREATE TYPE fuel_type            AS ENUM ('petrol','diesel','hybrid','electric','other');
CREATE TYPE vehicle_event_type   AS ENUM ('work_order','part_installed','inspection','accident_report','warranty_issued','warranty_claim','ownership_note','odometer');
CREATE TYPE work_order_status    AS ENUM ('draft','received','inspecting','awaiting_approval','awaiting_parts','in_progress','quality_check','ready','delivered','closed','cancelled','disputed','abandoned');
CREATE TYPE work_order_source    AS ENUM ('workshop','customer_request','fleet_po','accident_claim');
CREATE TYPE payment_terms        AS ENUM ('prepaid','on_delivery','deferred','installments','fleet_monthly');
CREATE TYPE wo_item_type         AS ENUM ('labor','part','paint','towing','storage','diagnostic','other');
CREATE TYPE part_condition       AS ENUM ('oem_new','aftermarket_new','used_scrapyard','refurbished');
CREATE TYPE inspection_type      AS ENUM ('check_in','progress','quality','check_out','accident','pre_purchase');
CREATE TYPE accident_report_status AS ENUM ('reported','under_assessment','assessed','approved','rejected','closed');
CREATE TYPE media_kind           AS ENUM ('image','video','audio','pdf','xml','other');
CREATE TYPE signature_method     AS ENUM ('nafath','otp','in_app_biometric','manual');
CREATE TYPE invoice_type         AS ENUM ('standard_tax','simplified_tax','credit_note','debit_note','proforma');
CREATE TYPE invoice_status       AS ENUM ('draft','issued','sent','partially_paid','paid','overdue','void','refunded');
CREATE TYPE zatca_status         AS ENUM ('not_required','pending','cleared','reported','rejected','failed');
CREATE TYPE payment_method       AS ENUM ('mada','apple_pay','visa','mastercard','sadad','bank_transfer','cash','wallet');
CREATE TYPE payment_status       AS ENUM ('initiated','pending','authorized','captured','failed','cancelled','refunded','partially_refunded');
CREATE TYPE escrow_status        AS ENUM ('pending','held','released','refunded','frozen','split');
CREATE TYPE ledger_account_type  AS ENUM ('asset','liability','equity','revenue','expense');
CREATE TYPE payout_status        AS ENUM ('scheduled','processing','paid','failed','cancelled');
CREATE TYPE pn_status            AS ENUM ('draft','pending_consent','issued','partially_settled','closed','cancelled','rejected','in_enforcement','enforced');
CREATE TYPE enforcement_status   AS ENUM ('preparing','filed','in_progress','settled','closed','withdrawn');
CREATE TYPE part_request_status  AS ENUM ('open','bidding','awarded','fulfilled','expired','cancelled');
CREATE TYPE bid_status           AS ENUM ('submitted','accepted','rejected','withdrawn','expired');
CREATE TYPE part_order_status    AS ENUM ('pending_payment','paid','preparing','shipped','delivered','installed','confirmed','returned','cancelled','disputed');
CREATE TYPE part_order_source    AS ENUM ('reverse_auction','catalog_buy_now','group_buy','trade_reorder');
CREATE TYPE part_serial_status   AS ENUM ('in_stock','sold','installed','claimed','returned','void');
CREATE TYPE trade_account_status AS ENUM ('pending','active','on_hold','closed');
CREATE TYPE warranty_status      AS ENUM ('active','claimed','replaced','refunded','expired','void');
CREATE TYPE warranty_claim_status AS ENUM ('open','under_review','approved_replace','approved_refund','rejected','closed');
CREATE TYPE transport_type       AS ENUM ('flatbed_tow','wheel_lift_tow','parts_delivery','heavy_tow');
CREATE TYPE transport_status     AS ENUM ('requested','assigned','en_route_pickup','picked_up','en_route_dropoff','delivered','cancelled','failed');
CREATE TYPE dispute_status       AS ENUM ('open','under_review','awaiting_parties','resolved','escalated','closed');
CREATE TYPE dispute_resolution   AS ENUM ('release_to_provider','refund_customer','split','replace_part','no_action');
CREATE TYPE notification_channel AS ENUM ('push','sms','email','whatsapp','in_app');
CREATE TYPE notification_status  AS ENUM ('queued','sent','delivered','failed','read');
CREATE TYPE integration_provider AS ENUM ('nafath','nafez','najiz','zatca','psp','escrow','monjez','vin_decoder','maps','sms','whatsapp','push','ai_vision','ai_speech');
CREATE TYPE integration_status   AS ENUM ('pending','in_flight','succeeded','failed','dead_letter');

-- -----------------------------------------------------------------------------
-- helper: updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. IDENTITY  (module: identity)
-- =============================================================================
CREATE TABLE users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164         varchar(20) UNIQUE,                       -- +9665XXXXXXXX
  email              citext UNIQUE,
  full_name_ar       varchar(150),
  full_name_en       varchar(150),
  national_id_hash   char(64) UNIQUE,                          -- sha256(salt+id) for lookup
  national_id_enc    bytea,                                    -- AES-256-GCM encrypted, key in KMS
  nationality_code   char(2),
  date_of_birth      date,
  preferred_locale   varchar(5) NOT NULL DEFAULT 'ar',
  status             user_status NOT NULL DEFAULT 'pending',
  platform_role      platform_role NOT NULL DEFAULT 'none',
  nafath_verified_at timestamptz,
  last_login_at      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_identities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        identity_provider NOT NULL,
  provider_uid    varchar(255) NOT NULL,                       -- nafath sub / phone / apple sub
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_uid)
);

CREATE TABLE devices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform       varchar(20) NOT NULL,                         -- ios | android | web
  device_name    varchar(120),
  push_token     text,
  app_flavor     varchar(20),                                  -- customer | partner | fleet
  app_version    varchar(20),
  last_seen_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz
);
CREATE INDEX idx_devices_user ON devices(user_id) WHERE revoked_at IS NULL;

CREATE TABLE refresh_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id      uuid REFERENCES devices(id) ON DELETE SET NULL,
  token_hash     char(64) NOT NULL UNIQUE,
  family_id      uuid NOT NULL,                                -- rotation family (reuse detection)
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE otp_challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164    varchar(20) NOT NULL,
  code_hash     char(64) NOT NULL,
  purpose       varchar(40) NOT NULL,                          -- login | sign_work_order | payout_confirm
  attempts      smallint NOT NULL DEFAULT 0,
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone ON otp_challenges(phone_e164, created_at DESC);

-- =============================================================================
-- 2. ORGANIZATIONS  (module: organizations)
-- =============================================================================
CREATE TABLE organizations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  org_type NOT NULL,
  status                org_status NOT NULL DEFAULT 'draft',
  legal_name_ar         varchar(200) NOT NULL,
  legal_name_en         varchar(200),
  trade_name_ar         varchar(200),
  trade_name_en         varchar(200),
  slug                  varchar(80) UNIQUE,
  cr_number             varchar(20) UNIQUE,                    -- السجل التجاري
  vat_number            varchar(15) UNIQUE,                    -- الرقم الضريبي (15 digits)
  vat_registered        boolean NOT NULL DEFAULT false,
  national_address      jsonb,                                 -- {building,street,district,city,postal_code,additional}
  phone_e164            varchar(20),
  email                 citext,
  logo_media_id         uuid,                                  -- FK added after media_assets
  description_ar        text,
  description_en        text,
  rating_avg            numeric(3,2) NOT NULL DEFAULT 0,
  rating_count          integer NOT NULL DEFAULT 0,
  commission_rate_bps   integer NOT NULL DEFAULT 500,          -- 500 = 5.00% (basis points)
  max_open_exposure_sar numeric(14,2) NOT NULL DEFAULT 20000,  -- risk limit for new orgs
  settings              jsonb NOT NULL DEFAULT '{}',           -- working hours, auto-accept, etc.
  verified_at           timestamptz,
  created_by            uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_orgs_type_status ON organizations(type, status);
CREATE INDEX idx_orgs_trade_name_trgm ON organizations USING gin (trade_name_ar gin_trgm_ops);

CREATE TABLE organization_locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name_ar       varchar(120),
  is_primary    boolean NOT NULL DEFAULT true,
  city          varchar(80) NOT NULL,
  district      varchar(120),
  industrial_zone varchar(120),                                -- المنطقة الصناعية (للتجميع في Pilot)
  address_line  text,
  geo           geography(Point,4326) NOT NULL,
  service_radius_km integer NOT NULL DEFAULT 25,
  working_hours jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_locations_geo ON organization_locations USING gist(geo);
CREATE INDEX idx_org_locations_org ON organization_locations(org_id);

CREATE TABLE organization_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        org_member_role NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]',                     -- fine-grained overrides
  is_active   boolean NOT NULL DEFAULT true,
  invited_by  uuid REFERENCES users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

CREATE TABLE vehicle_makes (
  id        smallserial PRIMARY KEY,
  name_ar   varchar(80) NOT NULL,
  name_en   varchar(80) NOT NULL UNIQUE,
  logo_url  text
);
CREATE TABLE vehicle_models (
  id        serial PRIMARY KEY,
  make_id   smallint NOT NULL REFERENCES vehicle_makes(id),
  name_ar   varchar(80) NOT NULL,
  name_en   varchar(80) NOT NULL,
  UNIQUE (make_id, name_en)
);

CREATE TABLE service_categories (
  id        smallserial PRIMARY KEY,
  code      varchar(40) NOT NULL UNIQUE,                       -- body_paint, mechanical, electrical, ac, tires, tuning...
  name_ar   varchar(80) NOT NULL,
  name_en   varchar(80) NOT NULL,
  parent_id smallint REFERENCES service_categories(id)
);

CREATE TABLE organization_specialties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  make_id      smallint REFERENCES vehicle_makes(id),          -- NULL = all makes
  category_id  smallint REFERENCES service_categories(id)      -- NULL = all categories
);
CREATE UNIQUE INDEX uq_org_specialties ON organization_specialties(org_id, COALESCE(make_id,0), COALESCE(category_id,0));

CREATE TABLE organization_bank_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bank_name     varchar(100) NOT NULL,
  iban_enc      bytea NOT NULL,                                -- encrypted
  iban_last4    char(4) NOT NULL,
  holder_name   varchar(150) NOT NULL,
  is_default    boolean NOT NULL DEFAULT true,
  verified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kyb_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type          kyb_doc_type NOT NULL,
  media_id      uuid NOT NULL,                                 -- FK to media_assets (added below)
  status        kyb_doc_status NOT NULL DEFAULT 'pending',
  expires_at    date,
  reviewed_by   uuid REFERENCES users(id),
  reviewed_at   timestamptz,
  rejection_reason text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            varchar(40) NOT NULL UNIQUE,                 -- basic | pro | enterprise | scrapyard_basic ...
  name_ar         varchar(80) NOT NULL,
  name_en         varchar(80) NOT NULL,
  applies_to      org_type[] NOT NULL,
  monthly_price   numeric(14,2) NOT NULL,
  yearly_price    numeric(14,2),
  commission_rate_bps integer NOT NULL,
  note_fee_sar    numeric(14,2) NOT NULL DEFAULT 15,           -- رسم إصدار السند
  features        jsonb NOT NULL DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true
);

CREATE TABLE subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         uuid NOT NULL REFERENCES subscription_plans(id),
  status          subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle   varchar(10) NOT NULL DEFAULT 'monthly',
  current_period_start timestamptz NOT NULL,
  current_period_end   timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_org ON subscriptions(org_id, status);

-- =============================================================================
-- 3. MEDIA  (shared, module: work-orders owns lifecycle)
-- =============================================================================
CREATE TABLE media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            media_kind NOT NULL,
  bucket          varchar(60) NOT NULL,
  object_key      text NOT NULL,
  mime_type       varchar(100) NOT NULL,
  size_bytes      bigint NOT NULL,
  sha256          char(64) NOT NULL,                           -- integrity + evidence
  width           integer,
  height          integer,
  duration_ms     integer,
  exif            jsonb,                                       -- gps/time as captured (evidence)
  captured_at     timestamptz,
  uploaded_by     uuid REFERENCES users(id),
  ai_labels       jsonb,                                       -- damage detection output
  is_immutable    boolean NOT NULL DEFAULT false,              -- true for signed docs (Object Lock)
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_key)
);
ALTER TABLE organizations ADD CONSTRAINT fk_orgs_logo FOREIGN KEY (logo_media_id) REFERENCES media_assets(id);
ALTER TABLE kyb_documents ADD CONSTRAINT fk_kyb_media FOREIGN KEY (media_id) REFERENCES media_assets(id);

-- =============================================================================
-- 4. VEHICLES  (module: vehicles)
-- =============================================================================
CREATE TABLE vehicles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin              char(17) UNIQUE,
  plate_number     varchar(12),                                -- e.g. "أ ب ج 1234"
  plate_number_en  varchar(12),
  make_id          smallint REFERENCES vehicle_makes(id),
  model_id         integer REFERENCES vehicle_models(id),
  model_year       smallint,
  trim             varchar(80),
  engine           varchar(80),
  fuel_type        fuel_type,
  color_ar         varchar(40),
  odometer_km      integer,
  owner_type       vehicle_owner_type NOT NULL,
  owner_user_id    uuid REFERENCES users(id),
  owner_org_id     uuid REFERENCES organizations(id),          -- fleets
  fleet_asset_code varchar(40),                                 -- رقم المركبة داخل الأسطول
  ownership_verified_at timestamptz,
  vin_decoded      jsonb,
  passport_public_token varchar(64) UNIQUE,                    -- share link token
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CHECK ((owner_type='user' AND owner_user_id IS NOT NULL) OR (owner_type='organization' AND owner_org_id IS NOT NULL))
);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_vehicles_owner_user ON vehicles(owner_user_id);
CREATE INDEX idx_vehicles_owner_org  ON vehicles(owner_org_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);

-- Car Passport: append-only, denormalized timeline
CREATE TABLE vehicle_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type           vehicle_event_type NOT NULL,
  occurred_at    timestamptz NOT NULL,
  odometer_km    integer,
  org_id         uuid REFERENCES organizations(id),
  ref_table      varchar(40),                                  -- work_orders | part_orders | warranties | inspections
  ref_id         uuid,
  summary_ar     text NOT NULL,
  summary_en     text,
  data           jsonb NOT NULL DEFAULT '{}',
  is_public      boolean NOT NULL DEFAULT true,                -- shown in shared passport
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_events_vehicle ON vehicle_events(vehicle_id, occurred_at DESC);

-- =============================================================================
-- 5. WORK ORDERS  (module: work-orders)
-- =============================================================================
CREATE TABLE work_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number              varchar(24) NOT NULL UNIQUE,             -- WO-2026-000123 (per platform)
  org_id              uuid NOT NULL REFERENCES organizations(id),
  location_id         uuid REFERENCES organization_locations(id),
  vehicle_id          uuid NOT NULL REFERENCES vehicles(id),
  customer_user_id    uuid REFERENCES users(id),               -- individual
  customer_org_id     uuid REFERENCES organizations(id),       -- fleet
  source              work_order_source NOT NULL DEFAULT 'workshop',
  status              work_order_status NOT NULL DEFAULT 'draft',
  payment_terms       payment_terms NOT NULL DEFAULT 'on_delivery',
  current_version     integer NOT NULL DEFAULT 1,
  title_ar            varchar(200),
  complaint_ar        text,                                    -- شكوى العميل
  diagnosis_ar        text,
  subtotal            numeric(14,2) NOT NULL DEFAULT 0,
  discount            numeric(14,2) NOT NULL DEFAULT 0,
  vat_amount          numeric(14,2) NOT NULL DEFAULT 0,
  total               numeric(14,2) NOT NULL DEFAULT 0,
  deposit_required    numeric(14,2) NOT NULL DEFAULT 0,        -- دفعة مقدمة (Escrow)
  due_date            date,                                    -- for deferred terms
  promised_ready_at   timestamptz,
  received_at         timestamptz,
  approved_at         timestamptz,
  ready_at            timestamptz,
  delivered_at        timestamptz,
  closed_at           timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  abandoned_notice_at timestamptz,                             -- بدء مسار السيارة المهجورة
  storage_fee_per_day numeric(14,2) NOT NULL DEFAULT 0,
  assigned_technician_id uuid REFERENCES users(id),
  accident_report_ref varchar(80),                             -- منجز/تقدير reference
  contract_terms_version varchar(20) NOT NULL DEFAULT 'v1',   -- نسخة العقد/الشروط المعتمدة
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_by          uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (customer_user_id IS NOT NULL OR customer_org_id IS NOT NULL)
);
CREATE TRIGGER trg_wo_updated BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_wo_org_status ON work_orders(org_id, status);
CREATE INDEX idx_wo_customer ON work_orders(customer_user_id, created_at DESC);
CREATE INDEX idx_wo_customer_org ON work_orders(customer_org_id, created_at DESC);
CREATE INDEX idx_wo_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_wo_ready_abandon ON work_orders(ready_at) WHERE status='ready';

CREATE TABLE work_order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id  uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  version_added  integer NOT NULL DEFAULT 1,
  version_removed integer,                                     -- NULL = still active
  type           wo_item_type NOT NULL,
  description_ar text NOT NULL,
  description_en text,
  part_condition part_condition,
  part_number    varchar(60),
  part_order_id  uuid,                                         -- FK to part_orders (marketplace) added later
  quantity       numeric(10,2) NOT NULL DEFAULT 1,
  unit_price     numeric(14,2) NOT NULL,
  discount       numeric(14,2) NOT NULL DEFAULT 0,
  vat_rate       numeric(5,2) NOT NULL DEFAULT 15.00,
  line_total     numeric(14,2) NOT NULL,                       -- (qty*unit - discount) excl VAT
  warranty_days  integer NOT NULL DEFAULT 0,
  is_completed   boolean NOT NULL DEFAULT false,
  completed_at   timestamptz,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_items_wo ON work_order_items(work_order_id);

-- Immutable snapshot of each version presented to the customer for approval
CREATE TABLE work_order_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id  uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  version        integer NOT NULL,
  reason_ar      text,                                         -- سبب التعديل (change order)
  snapshot       jsonb NOT NULL,                               -- items, totals, terms at that time
  snapshot_sha256 char(64) NOT NULL,                           -- what gets signed
  pdf_media_id   uuid REFERENCES media_assets(id),
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, version)
);

CREATE TABLE work_order_signatures (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id    uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  version_id       uuid NOT NULL REFERENCES work_order_versions(id),
  signer_user_id   uuid NOT NULL REFERENCES users(id),
  signer_role      varchar(30) NOT NULL,                       -- customer | fleet_approver | workshop
  purpose          varchar(30) NOT NULL,                       -- approve_scope | accept_delivery | acknowledge_terms
  method           signature_method NOT NULL,
  provider_tx_ref  varchar(120),                               -- Nafath transaction id
  provider_payload jsonb,
  signed_hash      char(64) NOT NULL,
  ip_address       inet,
  device_id        uuid REFERENCES devices(id),
  signed_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_signatures_wo ON work_order_signatures(work_order_id);

CREATE TABLE work_order_status_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id  uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  from_status    work_order_status,
  to_status      work_order_status NOT NULL,
  actor_user_id  uuid REFERENCES users(id),
  note_ar        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_history_wo ON work_order_status_history(work_order_id, created_at);

CREATE TABLE inspections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id  uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  vehicle_id     uuid NOT NULL REFERENCES vehicles(id),
  org_id         uuid REFERENCES organizations(id),
  type           inspection_type NOT NULL,
  odometer_km    integer,
  fuel_level_pct smallint,
  checklist      jsonb NOT NULL DEFAULT '{}',                  -- structured 8-angle + items
  damages        jsonb NOT NULL DEFAULT '[]',                  -- [{zone, severity, note, media_ids, ai_confidence}]
  ai_summary     jsonb,
  inspector_user_id uuid REFERENCES users(id),
  customer_ack_signature_id uuid REFERENCES work_order_signatures(id),
  performed_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspections_wo ON inspections(work_order_id);

-- polymorphic link: media ↔ any entity
CREATE TABLE media_links (
  media_id     uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  entity_type  varchar(40) NOT NULL,                           -- work_order | work_order_item | inspection | part_bid | dispute | transport_job ...
  entity_id    uuid NOT NULL,
  label        varchar(40),                                    -- before | after | damage | receipt | proof_of_delivery
  sort_order   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (media_id, entity_type, entity_id)
);
CREATE INDEX idx_media_links_entity ON media_links(entity_type, entity_id);

-- Voice-to-Invoice drafts
CREATE TABLE voice_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id  uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  media_id       uuid NOT NULL REFERENCES media_assets(id),
  recorded_by    uuid NOT NULL REFERENCES users(id),
  transcript_ar  text,
  extracted_items jsonb,                                       -- proposed line items
  status         varchar(20) NOT NULL DEFAULT 'pending',       -- pending | transcribed | applied | discarded
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accident_reports (                                -- تقرير حادث من منجز/تقدير (Step 21)
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       varchar(30) NOT NULL DEFAULT 'monjez',        -- الجهة تُؤكَّد لاحقاً — docs/integrations/monjez.md
  external_ref   varchar(80) NOT NULL,                         -- رقم البلاغ لدى المزوّد
  vehicle_id     uuid REFERENCES vehicles(id),
  work_order_id  uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  org_id         uuid REFERENCES organizations(id),            -- الورشة التي ربطت التقرير
  status         accident_report_status NOT NULL DEFAULT 'reported',
  accident_at    timestamptz,
  location_ar    varchar(200),
  plate_snapshot varchar(20),
  vin_snapshot   varchar(17),
  fault_percent  numeric(5,2),                                 -- نسبة الخطأ على مركبة العميل
  insurer_name_ar varchar(120),
  policy_no      varchar(60),
  claim_no       varchar(60),
  deductible_amount numeric(14,2),                             -- التحمّل على العميل
  approved_amount numeric(14,2),                               -- ما اعتمده التأمين للإصلاح
  damages        jsonb NOT NULL DEFAULT '[]',                  -- [{part_code,label_ar,severity,action}]
  repair_submission_ref varchar(80),                           -- مرجع تسجيل تقرير الإصلاح (FR-WO-10)
  repair_submitted_at timestamptz,
  raw            jsonb NOT NULL DEFAULT '{}',                  -- payload المزوّد بعد تنقية PII
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_ref)
);
CREATE TRIGGER trg_accident_reports_updated BEFORE UPDATE ON accident_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_accident_reports_wo ON accident_reports(work_order_id);
CREATE INDEX idx_accident_reports_vehicle ON accident_reports(vehicle_id, accident_at DESC);

-- =============================================================================
-- 6. INVOICING  (module: invoicing)
-- =============================================================================
CREATE TABLE invoice_sequences (
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  series      varchar(10) NOT NULL DEFAULT 'INV',
  year        smallint NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, series, year)
);

CREATE TABLE invoices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id),   -- seller
  number             varchar(40) NOT NULL,                     -- ORG-INV-2026-000001 (sequential per org)
  type               invoice_type NOT NULL DEFAULT 'simplified_tax',
  status             invoice_status NOT NULL DEFAULT 'draft',
  work_order_id      uuid REFERENCES work_orders(id),
  part_order_id      uuid,                                     -- FK later
  transport_job_id   uuid,                                     -- FK later
  parent_invoice_id  uuid REFERENCES invoices(id),             -- for credit/debit notes
  customer_user_id   uuid REFERENCES users(id),
  customer_org_id    uuid REFERENCES organizations(id),
  buyer_snapshot     jsonb NOT NULL,                           -- name, vat no, address as of issue
  seller_snapshot    jsonb NOT NULL,
  currency           char(3) NOT NULL DEFAULT 'SAR',
  subtotal           numeric(14,2) NOT NULL,
  discount_total     numeric(14,2) NOT NULL DEFAULT 0,
  vat_total          numeric(14,2) NOT NULL,
  total              numeric(14,2) NOT NULL,
  paid_total         numeric(14,2) NOT NULL DEFAULT 0,
  payment_terms      payment_terms NOT NULL,
  issue_date         timestamptz,
  due_date           date,
  supply_date        date,
  -- ZATCA
  zatca_uuid         uuid,                                     -- invoice UUID in XML
  zatca_icv          bigint,                                   -- invoice counter value (per device)
  zatca_pih          text,                                     -- previous invoice hash
  zatca_hash         text,                                     -- this invoice hash
  zatca_qr           text,                                     -- base64 TLV
  zatca_xml       text,                                          -- signed UBL (Phase 2) — archived 6 years per ZATCA
  zatca_status       zatca_status NOT NULL DEFAULT 'not_required',
  xml_media_id       uuid REFERENCES media_assets(id),
  pdf_media_id       uuid REFERENCES media_assets(id),
  notes_ar           text,
  voided_at          timestamptz,
  void_reason        text,
  created_by         uuid REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, number),
  CHECK (customer_user_id IS NOT NULL OR customer_org_id IS NOT NULL)
);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_invoices_org_status ON invoices(org_id, status);
CREATE INDEX idx_invoices_customer ON invoices(customer_user_id);
CREATE INDEX idx_invoices_customer_org ON invoices(customer_org_id);
CREATE INDEX idx_invoices_due ON invoices(due_date) WHERE status IN ('issued','sent','partially_paid','overdue');

CREATE TABLE invoice_lines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  work_order_item_id uuid REFERENCES work_order_items(id),
  description_ar text NOT NULL,
  description_en text,
  quantity       numeric(10,2) NOT NULL,
  unit_price     numeric(14,2) NOT NULL,
  discount       numeric(14,2) NOT NULL DEFAULT 0,
  vat_rate       numeric(5,2) NOT NULL DEFAULT 15.00,
  vat_amount     numeric(14,2) NOT NULL,
  line_total     numeric(14,2) NOT NULL,                       -- excl VAT
  sort_order     integer NOT NULL DEFAULT 0
);

CREATE TABLE zatca_devices (                                   -- EGS units / CSIDs per org
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_name        varchar(80) NOT NULL,
  csid_enc         bytea,                                      -- compliance/production CSID + private key (encrypted)
  csid_expires_at  timestamptz,
  is_production    boolean NOT NULL DEFAULT false,
  last_icv         bigint NOT NULL DEFAULT 0,
  last_hash        text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE zatca_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  device_id     uuid REFERENCES zatca_devices(id),
  mode          varchar(10) NOT NULL,                          -- clearance | reporting
  request_hash  char(64),
  response_code integer,
  response      jsonb,
  warnings      jsonb,
  errors        jsonb,
  status        zatca_status NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_zatca_submissions_invoice ON zatca_submissions(invoice_id);

-- =============================================================================
-- 7. PAYMENTS, ESCROW, LEDGER, PAYOUTS  (module: payments)
-- =============================================================================
CREATE TABLE payments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id         uuid REFERENCES invoices(id),
  work_order_id      uuid REFERENCES work_orders(id),          -- deposits before invoice
  part_order_id      uuid,                                     -- FK later
  payer_user_id      uuid REFERENCES users(id),
  payer_org_id       uuid REFERENCES organizations(id),
  payee_org_id       uuid NOT NULL REFERENCES organizations(id),
  method             payment_method NOT NULL,
  status             payment_status NOT NULL DEFAULT 'initiated',
  amount             numeric(14,2) NOT NULL CHECK (amount > 0),
  currency           char(3) NOT NULL DEFAULT 'SAR',
  psp_provider       varchar(40),
  psp_intent_id      varchar(120),
  psp_charge_id      varchar(120),
  psp_payload        jsonb,
  idempotency_key    varchar(120) NOT NULL UNIQUE,
  failure_reason     text,
  authorized_at      timestamptz,
  captured_at        timestamptz,
  refunded_amount    numeric(14,2) NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_payee ON payments(payee_org_id, created_at DESC);
CREATE UNIQUE INDEX uq_payments_psp_charge ON payments(psp_provider, psp_charge_id) WHERE psp_charge_id IS NOT NULL;

CREATE TABLE escrow_holds (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        uuid NOT NULL REFERENCES payments(id),
  beneficiary_org_id uuid NOT NULL REFERENCES organizations(id),
  work_order_id     uuid REFERENCES work_orders(id),
  part_order_id     uuid,                                      -- FK later
  amount            numeric(14,2) NOT NULL,
  platform_fee      numeric(14,2) NOT NULL DEFAULT 0,          -- computed at release
  status            escrow_status NOT NULL DEFAULT 'pending',
  auto_release_at   timestamptz,                               -- delivered_at + 72h
  released_amount   numeric(14,2) NOT NULL DEFAULT 0,
  refunded_amount   numeric(14,2) NOT NULL DEFAULT 0,
  release_reason    varchar(40),                               -- customer_confirmed | auto_timeout | dispute_decision
  dispute_id        uuid,                                      -- FK later
  escrow_provider_ref varchar(120),                            -- partner bank/PSP hold reference
  held_at           timestamptz,
  released_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_escrow_updated BEFORE UPDATE ON escrow_holds FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_escrow_org_status ON escrow_holds(beneficiary_org_id, status);
CREATE INDEX idx_escrow_auto_release ON escrow_holds(auto_release_at) WHERE status='held';

-- Double-entry ledger --------------------------------------------------------
CREATE TABLE ledger_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(60) NOT NULL UNIQUE,                     -- e.g. 'psp_clearing', 'escrow_liability:{org}', 'org_available:{org}', 'platform_revenue:commission'
  type        ledger_account_type NOT NULL,
  org_id      uuid REFERENCES organizations(id),               -- NULL = platform account
  currency    char(3) NOT NULL DEFAULT 'SAR',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_accounts_org ON ledger_accounts(org_id);

CREATE TABLE ledger_entries (                                  -- journal header (append-only)
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type      varchar(40) NOT NULL,                        -- payment_captured | escrow_release | fee | payout | refund | subscription | adjustment
  ref_table       varchar(40),
  ref_id          uuid,
  description     text,
  idempotency_key varchar(120) NOT NULL UNIQUE,
  posted_by       uuid REFERENCES users(id),
  posted_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_entries_ref ON ledger_entries(ref_table, ref_id);

CREATE TABLE ledger_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    uuid NOT NULL REFERENCES ledger_entries(id) ON DELETE RESTRICT,
  account_id  uuid NOT NULL REFERENCES ledger_accounts(id),
  debit       numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit      numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX idx_ledger_lines_account ON ledger_lines(account_id);

-- Guard: an entry must balance (checked by deferred constraint trigger)
CREATE OR REPLACE FUNCTION assert_entry_balanced() RETURNS trigger AS $$
DECLARE d numeric; c numeric;
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO d, c
    FROM ledger_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id);
  IF d <> c THEN RAISE EXCEPTION 'Ledger entry % is unbalanced (D=% C=%)', COALESCE(NEW.entry_id, OLD.entry_id), d, c; END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER trg_ledger_balanced AFTER INSERT OR UPDATE OR DELETE ON ledger_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_entry_balanced();

-- Materialized balances (refreshed by worker or computed on demand)
CREATE VIEW ledger_balances AS
  SELECT a.id AS account_id, a.code, a.org_id, a.type,
         COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0) AS debit_balance
  FROM ledger_accounts a LEFT JOIN ledger_lines l ON l.account_id = a.id
  GROUP BY a.id;

CREATE TABLE payouts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id),
  bank_account_id  uuid NOT NULL REFERENCES organization_bank_accounts(id),
  amount           numeric(14,2) NOT NULL CHECK (amount > 0),
  status           payout_status NOT NULL DEFAULT 'scheduled',
  provider_ref     varchar(120),
  scheduled_for    date NOT NULL,
  processed_at     timestamptz,
  failure_reason   text,
  ledger_entry_id  uuid REFERENCES ledger_entries(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_org ON payouts(org_id, status);

CREATE TABLE payout_items (                                    -- which escrow releases compose a payout
  payout_id       uuid NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  escrow_hold_id  uuid NOT NULL REFERENCES escrow_holds(id),
  amount          numeric(14,2) NOT NULL,
  PRIMARY KEY (payout_id, escrow_hold_id)
);

CREATE TABLE refunds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    uuid NOT NULL REFERENCES payments(id),
  amount        numeric(14,2) NOT NULL CHECK (amount > 0),
  reason        text,
  psp_refund_id varchar(120),
  status        payment_status NOT NULL DEFAULT 'initiated',
  requested_by  uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

-- =============================================================================
-- 8. PROMISSORY NOTES (نافذ) & ENFORCEMENT (ناجز)  (module: promissory-notes)
-- =============================================================================
CREATE TABLE promissory_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number              varchar(24) NOT NULL UNIQUE,             -- PN-2026-000045 (internal)
  nafez_reference     varchar(80) UNIQUE,                      -- رقم السند في نافذ
  status              pn_status NOT NULL DEFAULT 'draft',
  creditor_org_id     uuid NOT NULL REFERENCES organizations(id),
  debtor_user_id      uuid REFERENCES users(id),
  debtor_org_id       uuid REFERENCES organizations(id),
  work_order_id       uuid REFERENCES work_orders(id),
  invoice_id          uuid REFERENCES invoices(id),
  part_order_id       uuid,                                    -- FK later
  amount              numeric(14,2) NOT NULL CHECK (amount > 0),
  outstanding_amount  numeric(14,2) NOT NULL,
  currency            char(3) NOT NULL DEFAULT 'SAR',
  issue_date          date,
  due_date            date NOT NULL,
  place_of_issue      varchar(80) NOT NULL DEFAULT 'الرياض',
  consent_signature_id uuid REFERENCES work_order_signatures(id), -- Nafath consent for issuance
  issuance_fee        numeric(14,2) NOT NULL DEFAULT 0,        -- platform fee
  nafez_payload       jsonb,                                   -- request/response snapshots
  pdf_media_id        uuid REFERENCES media_assets(id),
  issued_at           timestamptz,
  closed_at           timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_by          uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (debtor_user_id IS NOT NULL OR debtor_org_id IS NOT NULL)
);
CREATE TRIGGER trg_pn_updated BEFORE UPDATE ON promissory_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_pn_creditor ON promissory_notes(creditor_org_id, status);
CREATE INDEX idx_pn_debtor ON promissory_notes(debtor_user_id, status);
CREATE INDEX idx_pn_due ON promissory_notes(due_date) WHERE status IN ('issued','partially_settled');

CREATE TABLE promissory_note_events (                          -- append-only lifecycle log
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id        uuid NOT NULL REFERENCES promissory_notes(id) ON DELETE CASCADE,
  from_status    pn_status,
  to_status      pn_status NOT NULL,
  amount_delta   numeric(14,2),                                -- for partial settlement
  payment_id     uuid REFERENCES payments(id),
  provider_ref   varchar(120),
  provider_payload jsonb,
  actor_user_id  uuid REFERENCES users(id),
  note_ar        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pn_events_note ON promissory_note_events(note_id, created_at);

CREATE TABLE settlements (                                     -- المخالصة الرقمية
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         varchar(24) NOT NULL UNIQUE,                  -- MK-2026-000045
  note_id        uuid REFERENCES promissory_notes(id),
  invoice_id     uuid REFERENCES invoices(id),
  work_order_id  uuid REFERENCES work_orders(id),
  creditor_org_id uuid NOT NULL REFERENCES organizations(id),
  debtor_user_id uuid REFERENCES users(id),
  debtor_org_id  uuid REFERENCES organizations(id),
  amount_settled numeric(14,2) NOT NULL,
  pdf_media_id   uuid REFERENCES media_assets(id),
  content_sha256 char(64) NOT NULL,
  issued_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE enforcement_cases (                               -- ناجز
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id         uuid NOT NULL REFERENCES promissory_notes(id),
  status          enforcement_status NOT NULL DEFAULT 'preparing',
  najiz_case_ref  varchar(80),
  requested_by    uuid REFERENCES users(id),
  bundle_media_id uuid REFERENCES media_assets(id),            -- zip/pdf of evidence bundle
  claimed_amount  numeric(14,2) NOT NULL,
  recovered_amount numeric(14,2) NOT NULL DEFAULT 0,
  is_abandoned_vehicle boolean NOT NULL DEFAULT false,         -- مسار المركبة المهجورة
  storage_fees_claimed numeric(14,2) NOT NULL DEFAULT 0,
  timeline        jsonb NOT NULL DEFAULT '[]',
  filed_at        timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_enforcement_updated BEFORE UPDATE ON enforcement_cases FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE dunning_notices (                                 -- تذكيرات وإشعارات رسمية قبل التنفيذ
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id       uuid REFERENCES promissory_notes(id),
  invoice_id    uuid REFERENCES invoices(id),
  step          smallint NOT NULL,                             -- 1..N
  channel       notification_channel NOT NULL,
  is_formal     boolean NOT NULL DEFAULT false,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  proof_media_id uuid REFERENCES media_assets(id)
);

-- =============================================================================
-- 9. PARTS MARKETPLACE  (module: parts-marketplace)
-- =============================================================================
CREATE TABLE part_categories (
  id        serial PRIMARY KEY,
  code      varchar(60) NOT NULL UNIQUE,                       -- engine, gearbox, bumper_front, headlight_left ...
  name_ar   varchar(100) NOT NULL,
  name_en   varchar(100) NOT NULL,
  parent_id integer REFERENCES part_categories(id),
  is_major_component boolean NOT NULL DEFAULT false            -- محرك/قير → ضمان إلزامي
);

-- ---- Master parts catalog (وكلاء/موزّعو القطع) ------------------------------
CREATE TABLE part_brands (
  id            serial PRIMARY KEY,
  name_ar       varchar(80) NOT NULL,
  name_en       varchar(80) NOT NULL UNIQUE,
  is_oem        boolean NOT NULL DEFAULT false,               -- علامة سيارات (Toyota) vs علامة قطع (Bosch)
  agent_org_id  uuid REFERENCES organizations(id),            -- الوكيل المعتمد للعلامة في المملكة (إن وُجد)
  logo_url      text
);

CREATE TABLE parts_catalog (                                   -- تعريف القطعة (مستقل عن المخزون)
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       integer NOT NULL REFERENCES part_brands(id),
  part_number    varchar(60) NOT NULL,                         -- رقم المصنّع
  oem_numbers    text[] NOT NULL DEFAULT '{}',                 -- أرقام OEM المكافئة (للبدائل)
  category_id    integer REFERENCES part_categories(id),
  name_ar        varchar(200) NOT NULL,
  name_en        varchar(200),
  description_ar text,
  specs          jsonb NOT NULL DEFAULT '{}',                  -- أبعاد/مواصفات
  image_media_id uuid REFERENCES media_assets(id),
  barcode        varchar(40),
  is_serialized  boolean NOT NULL DEFAULT false,               -- تُصدر لها أرقام تسلسلية/QR للمصادقة
  created_by_org_id uuid REFERENCES organizations(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, part_number)
);
CREATE TRIGGER trg_parts_catalog_updated BEFORE UPDATE ON parts_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_parts_catalog_pn ON parts_catalog(part_number);
CREATE INDEX idx_parts_catalog_oem ON parts_catalog USING gin(oem_numbers);
CREATE INDEX idx_parts_catalog_name_trgm ON parts_catalog USING gin (name_ar gin_trgm_ops);

CREATE TABLE part_fitments (                                   -- توافق القطعة مع المركبات (VIN lookup)
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id   uuid NOT NULL REFERENCES parts_catalog(id) ON DELETE CASCADE,
  make_id      smallint NOT NULL REFERENCES vehicle_makes(id),
  model_id     integer REFERENCES vehicle_models(id),          -- NULL = all models of make
  year_from    smallint,
  year_to      smallint,
  engine_code  varchar(40),
  trim         varchar(80),
  notes_ar     text,
  source       varchar(30) NOT NULL DEFAULT 'agent'            -- agent | tecdoc | manual | ai_suggested
);
CREATE UNIQUE INDEX uq_part_fitments ON part_fitments(catalog_id, make_id, COALESCE(model_id,0), COALESCE(year_from,0), COALESCE(year_to,0), COALESCE(engine_code,''));
CREATE INDEX idx_part_fitments_lookup ON part_fitments(make_id, model_id, year_from, year_to);

CREATE TABLE part_serials (                                    -- مصادقة القطعة (Anti-counterfeit) — QR لكل وحدة
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id     uuid NOT NULL REFERENCES parts_catalog(id),
  serial_number  varchar(80) NOT NULL,
  qr_token       varchar(64) NOT NULL UNIQUE,
  batch_code     varchar(40),
  issuer_org_id  uuid NOT NULL REFERENCES organizations(id),   -- الوكيل الذي أصدرها
  owner_org_id   uuid REFERENCES organizations(id),            -- المالك الحالي (وكيل → ورشة)
  status         part_serial_status NOT NULL DEFAULT 'in_stock',
  part_order_id  uuid,                                         -- FK later
  work_order_item_id uuid REFERENCES work_order_items(id),     -- أين رُكّبت
  vehicle_id     uuid REFERENCES vehicles(id),
  installed_at   timestamptz,
  scan_count     integer NOT NULL DEFAULT 0,                   -- كثرة المسح من مواقع مختلفة = مؤشر تقليد
  last_scanned_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, serial_number)
);
CREATE INDEX idx_part_serials_owner ON part_serials(owner_org_id, status);

CREATE TABLE trade_accounts (                                  -- الحساب الآجل المضمون (وكيل ↔ ورشة) — كل فاتورة آجلة = سند لأمر
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_org_id    uuid NOT NULL REFERENCES organizations(id), -- الوكيل/الموزّع
  buyer_org_id     uuid NOT NULL REFERENCES organizations(id), -- الورشة
  status           trade_account_status NOT NULL DEFAULT 'pending',
  credit_limit     numeric(14,2) NOT NULL DEFAULT 0,
  outstanding      numeric(14,2) NOT NULL DEFAULT 0,           -- derived from ledger; cached
  payment_terms_days smallint NOT NULL DEFAULT 30,
  discount_bps     integer NOT NULL DEFAULT 0,                 -- خصم تفضيلي للورشة
  requires_note    boolean NOT NULL DEFAULT true,              -- إصدار سند لأمر لكل فاتورة آجلة
  guarantor_signature_id uuid REFERENCES work_order_signatures(id), -- توقيع مالك الورشة (نفاذ) على اتفاقية الحساب
  approved_by      uuid REFERENCES users(id),
  approved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_org_id, buyer_org_id)
);
CREATE TRIGGER trg_trade_accounts_updated BEFORE UPDATE ON trade_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_trade_accounts_buyer ON trade_accounts(buyer_org_id, status);

CREATE TABLE supplier_inventory (                              -- مخزون المورد (وكيل/محل/تشليح) — حي عبر ERP sync أو يدوي
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id    uuid REFERENCES organization_locations(id),   -- المستودع/الفرع
  catalog_id     uuid REFERENCES parts_catalog(id),            -- NULL for unlisted scrapyard parts
  category_id    integer REFERENCES part_categories(id),
  make_id        smallint REFERENCES vehicle_makes(id),
  model_id       integer REFERENCES vehicle_models(id),
  year_from      smallint,
  year_to        smallint,
  part_number    varchar(60),
  condition      part_condition NOT NULL,
  title_ar       varchar(200) NOT NULL,
  description_ar text,
  price          numeric(14,2),                                -- سعر التجزئة (Buy Now)
  trade_price    numeric(14,2),                                -- سعر الورش/الجملة (Trade account)
  quantity       integer NOT NULL DEFAULT 1,
  reserved_qty   integer NOT NULL DEFAULT 0,
  donor_vin      char(17),                                     -- المركبة المصدر (تشليح)
  warranty_days  integer NOT NULL DEFAULT 0,
  lead_time_hours integer,                                     -- زمن التجهيز للتوصيل
  external_sku   varchar(60),                                  -- رقم الصنف في ERP الوكيل
  synced_at      timestamptz,                                  -- آخر مزامنة ERP
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_lookup ON supplier_inventory(make_id, model_id, category_id) WHERE is_active;
CREATE INDEX idx_inventory_catalog ON supplier_inventory(catalog_id) WHERE is_active AND quantity > 0;
CREATE UNIQUE INDEX uq_inventory_external_sku ON supplier_inventory(org_id, external_sku) WHERE external_sku IS NOT NULL;

CREATE TABLE inventory_sync_runs (                             -- سجل مزامنة مخزون الوكيل (CSV/API)
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source       varchar(20) NOT NULL,                           -- csv | api | manual
  file_media_id uuid REFERENCES media_assets(id),
  rows_total   integer, rows_upserted integer, rows_failed integer,
  errors       jsonb,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);
CREATE INDEX idx_inventory_title_trgm ON supplier_inventory USING gin (title_ar gin_trgm_ops);

CREATE TABLE part_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number            varchar(24) NOT NULL UNIQUE,               -- PR-2026-000789
  requester_user_id uuid REFERENCES users(id),
  requester_org_id  uuid REFERENCES organizations(id),         -- workshop / fleet
  work_order_id     uuid REFERENCES work_orders(id),
  vehicle_id        uuid REFERENCES vehicles(id),
  vin               char(17),
  category_id       integer REFERENCES part_categories(id),
  part_name_ar      varchar(200) NOT NULL,
  part_number       varchar(60),
  description_ar    text,
  accepted_conditions part_condition[] NOT NULL DEFAULT ARRAY['oem_new','aftermarket_new','used_scrapyard']::part_condition[],
  quantity          integer NOT NULL DEFAULT 1,
  deliver_to_geo    geography(Point,4326),
  deliver_to_address text,
  search_radius_km  integer NOT NULL DEFAULT 50,
  bidding_ends_at   timestamptz NOT NULL,
  status            part_request_status NOT NULL DEFAULT 'open',
  awarded_bid_id    uuid,                                      -- FK later
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_user_id IS NOT NULL OR requester_org_id IS NOT NULL)
);
CREATE TRIGGER trg_part_requests_updated BEFORE UPDATE ON part_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_part_requests_status_ends ON part_requests(status, bidding_ends_at);
CREATE INDEX idx_part_requests_geo ON part_requests USING gist(deliver_to_geo);

CREATE TABLE part_request_recipients (                         -- من وصله الطلب (توزيع)
  request_id   uuid NOT NULL REFERENCES part_requests(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notified_at  timestamptz NOT NULL DEFAULT now(),
  viewed_at    timestamptz,
  distance_km  numeric(6,2),
  PRIMARY KEY (request_id, org_id)
);

CREATE TABLE part_bids (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES part_requests(id) ON DELETE CASCADE,
  supplier_org_id uuid NOT NULL REFERENCES organizations(id),
  inventory_id    uuid REFERENCES supplier_inventory(id),
  condition       part_condition NOT NULL,
  unit_price      numeric(14,2) NOT NULL CHECK (unit_price > 0),
  quantity        integer NOT NULL DEFAULT 1,
  vat_rate        numeric(5,2) NOT NULL DEFAULT 15.00,
  delivery_fee    numeric(14,2) NOT NULL DEFAULT 0,
  delivery_eta_hours integer,
  warranty_days   integer NOT NULL DEFAULT 0,
  warranty_terms_ar text,
  donor_vin       char(17),
  notes_ar        text,
  status          bid_status NOT NULL DEFAULT 'submitted',
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, supplier_org_id)                          -- one live bid per supplier (update in place)
);
CREATE TRIGGER trg_part_bids_updated BEFORE UPDATE ON part_bids FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_part_bids_request ON part_bids(request_id, status);
ALTER TABLE part_requests ADD CONSTRAINT fk_part_requests_awarded FOREIGN KEY (awarded_bid_id) REFERENCES part_bids(id);

CREATE TABLE part_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number           varchar(24) NOT NULL UNIQUE,                -- PO-2026-000321
  source           part_order_source NOT NULL DEFAULT 'reverse_auction',
  request_id       uuid REFERENCES part_requests(id),          -- required when source=reverse_auction
  bid_id           uuid REFERENCES part_bids(id),
  trade_account_id uuid REFERENCES trade_accounts(id),         -- آجل مضمون (وكيل ↔ ورشة)
  group_buy_id     uuid,                                       -- FK later
  buyer_user_id    uuid REFERENCES users(id),
  buyer_org_id     uuid REFERENCES organizations(id),
  supplier_org_id  uuid NOT NULL REFERENCES organizations(id),
  work_order_id    uuid REFERENCES work_orders(id),
  payment_terms    payment_terms NOT NULL DEFAULT 'prepaid',   -- deferred ⇒ promissory note via trade account
  status           part_order_status NOT NULL DEFAULT 'pending_payment',
  subtotal         numeric(14,2) NOT NULL,
  delivery_fee     numeric(14,2) NOT NULL DEFAULT 0,
  vat_amount       numeric(14,2) NOT NULL,
  total            numeric(14,2) NOT NULL,
  transport_job_id uuid,                                       -- FK later
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  installed_at     timestamptz,
  confirmed_at     timestamptz,
  auto_confirm_at  timestamptz,                                -- delivered + 72h
  cancelled_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_user_id IS NOT NULL OR buyer_org_id IS NOT NULL),
  CHECK (source <> 'reverse_auction' OR (request_id IS NOT NULL AND bid_id IS NOT NULL))
);
CREATE TRIGGER trg_part_orders_updated BEFORE UPDATE ON part_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_part_orders_supplier ON part_orders(supplier_org_id, status);
CREATE INDEX idx_part_orders_buyer ON part_orders(buyer_user_id);
CREATE INDEX idx_part_orders_buyer_org ON part_orders(buyer_org_id, created_at DESC);
CREATE INDEX idx_part_orders_trade ON part_orders(trade_account_id) WHERE trade_account_id IS NOT NULL;

CREATE TABLE part_order_items (                                -- بنود الطلب (Buy Now / Trade قد يحوي عدة قطع)
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_order_id  uuid NOT NULL REFERENCES part_orders(id) ON DELETE CASCADE,
  inventory_id   uuid REFERENCES supplier_inventory(id),
  catalog_id     uuid REFERENCES parts_catalog(id),
  description_ar varchar(200) NOT NULL,
  condition      part_condition NOT NULL,
  quantity       integer NOT NULL CHECK (quantity > 0),
  unit_price     numeric(14,2) NOT NULL,
  vat_rate       numeric(5,2) NOT NULL DEFAULT 15.00,
  line_total     numeric(14,2) NOT NULL,
  warranty_days  integer NOT NULL DEFAULT 0,
  core_return_credit numeric(14,2) NOT NULL DEFAULT 0          -- خصم مقابل إرجاع القطعة القديمة
);
CREATE INDEX idx_part_order_items_order ON part_order_items(part_order_id);
ALTER TABLE part_serials ADD CONSTRAINT fk_part_serials_order FOREIGN KEY (part_order_id) REFERENCES part_orders(id);

CREATE TABLE group_buys (                                      -- الشراء الجماعي لورش المنطقة الصناعية
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         varchar(24) NOT NULL UNIQUE,                  -- GB-2026-000010
  supplier_org_id uuid NOT NULL REFERENCES organizations(id),
  catalog_id     uuid NOT NULL REFERENCES parts_catalog(id),
  industrial_zone varchar(120),
  unit_price     numeric(14,2) NOT NULL,                       -- سعر الجملة عند بلوغ الحد
  min_quantity   integer NOT NULL,
  committed_qty  integer NOT NULL DEFAULT 0,
  closes_at      timestamptz NOT NULL,
  status         varchar(20) NOT NULL DEFAULT 'open',          -- open | reached | fulfilled | failed
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE part_orders ADD CONSTRAINT fk_part_orders_group_buy FOREIGN KEY (group_buy_id) REFERENCES group_buys(id);
-- deferred FKs
ALTER TABLE work_order_items ADD CONSTRAINT fk_wo_items_part_order FOREIGN KEY (part_order_id) REFERENCES part_orders(id);
ALTER TABLE invoices        ADD CONSTRAINT fk_invoices_part_order FOREIGN KEY (part_order_id) REFERENCES part_orders(id);
ALTER TABLE payments        ADD CONSTRAINT fk_payments_part_order FOREIGN KEY (part_order_id) REFERENCES part_orders(id);
ALTER TABLE escrow_holds    ADD CONSTRAINT fk_escrow_part_order  FOREIGN KEY (part_order_id) REFERENCES part_orders(id);
ALTER TABLE promissory_notes ADD CONSTRAINT fk_pn_part_order     FOREIGN KEY (part_order_id) REFERENCES part_orders(id);

CREATE TABLE warranties (                                      -- الضمان الرقمي
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number           varchar(24) NOT NULL UNIQUE,                -- WR-2026-000100
  qr_token         varchar(64) NOT NULL UNIQUE,
  issuer_org_id    uuid NOT NULL REFERENCES organizations(id), -- supplier or workshop
  beneficiary_user_id uuid REFERENCES users(id),
  beneficiary_org_id  uuid REFERENCES organizations(id),
  vehicle_id       uuid REFERENCES vehicles(id),
  part_order_id    uuid REFERENCES part_orders(id),
  work_order_item_id uuid REFERENCES work_order_items(id),
  part_serial_id   uuid REFERENCES part_serials(id),           -- الضمان الثلاثي: قطعة موثّقة + تركيب
  installer_org_id uuid REFERENCES organizations(id),          -- الورشة المركِّبة (ضمان التركيب)
  covers           varchar(20) NOT NULL DEFAULT 'part',        -- part | labor | part_and_labor
  category_id      integer REFERENCES part_categories(id),
  condition        part_condition,
  coverage_ar      text NOT NULL,                              -- ما يغطيه الضمان
  exclusions_ar    text,
  starts_at        date NOT NULL,
  ends_at          date NOT NULL,
  km_limit         integer,
  status           warranty_status NOT NULL DEFAULT 'active',
  certificate_media_id uuid REFERENCES media_assets(id),
  content_sha256   char(64) NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at >= starts_at)
);
CREATE INDEX idx_warranties_beneficiary ON warranties(beneficiary_user_id);
CREATE INDEX idx_warranties_vehicle ON warranties(vehicle_id);

CREATE TABLE warranty_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id   uuid NOT NULL REFERENCES warranties(id),
  claimant_user_id uuid REFERENCES users(id),
  description_ar text NOT NULL,
  status        warranty_claim_status NOT NULL DEFAULT 'open',
  resolution_ar text,
  dispute_id    uuid,                                          -- FK later
  resolved_by   uuid REFERENCES users(id),
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 10. LOGISTICS  (module: logistics)
-- =============================================================================
CREATE TABLE transport_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number           varchar(24) NOT NULL UNIQUE,                -- TJ-2026-000050
  type             transport_type NOT NULL,
  status           transport_status NOT NULL DEFAULT 'requested',
  requester_user_id uuid REFERENCES users(id),
  requester_org_id uuid REFERENCES organizations(id),
  provider_org_id  uuid REFERENCES organizations(id),          -- logistics company (nullable until assigned)
  driver_user_id   uuid REFERENCES users(id),
  vehicle_id       uuid REFERENCES vehicles(id),               -- towed vehicle
  work_order_id    uuid REFERENCES work_orders(id),
  part_order_id    uuid REFERENCES part_orders(id),
  pickup_geo       geography(Point,4326) NOT NULL,
  pickup_address   text,
  dropoff_geo      geography(Point,4326) NOT NULL,
  dropoff_address  text,
  distance_km      numeric(7,2),
  quoted_price     numeric(14,2),
  final_price      numeric(14,2),
  platform_margin  numeric(14,2) NOT NULL DEFAULT 0,
  scheduled_at     timestamptz,
  assigned_at      timestamptz,
  picked_up_at     timestamptz,
  delivered_at     timestamptz,
  proof_media_id   uuid REFERENCES media_assets(id),
  proof_otp_verified boolean NOT NULL DEFAULT false,
  notes_ar         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_transport_updated BEFORE UPDATE ON transport_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_transport_status ON transport_jobs(status, created_at DESC);
CREATE INDEX idx_transport_pickup_geo ON transport_jobs USING gist(pickup_geo);
ALTER TABLE part_orders ADD CONSTRAINT fk_part_orders_transport FOREIGN KEY (transport_job_id) REFERENCES transport_jobs(id);
ALTER TABLE invoices    ADD CONSTRAINT fk_invoices_transport    FOREIGN KEY (transport_job_id) REFERENCES transport_jobs(id);

CREATE TABLE transport_tracking (                              -- high-volume; partition by month in prod
  id           bigserial PRIMARY KEY,
  job_id       uuid NOT NULL REFERENCES transport_jobs(id) ON DELETE CASCADE,
  geo          geography(Point,4326) NOT NULL,
  speed_kmh    numeric(5,1),
  heading      smallint,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transport_tracking_job ON transport_tracking(job_id, recorded_at DESC);

CREATE TABLE driver_profiles (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  org_id         uuid REFERENCES organizations(id),
  license_number_enc bytea,
  truck_plate    varchar(12),
  truck_type     transport_type,
  is_online      boolean NOT NULL DEFAULT false,
  last_geo       geography(Point,4326),
  last_geo_at    timestamptz,
  rating_avg     numeric(3,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_driver_geo ON driver_profiles USING gist(last_geo) WHERE is_online;

-- =============================================================================
-- 11. DISPUTES & REVIEWS  (module: disputes)
-- =============================================================================
CREATE TABLE disputes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number          varchar(24) NOT NULL UNIQUE,                 -- DS-2026-000012
  status          dispute_status NOT NULL DEFAULT 'open',
  opened_by_user_id uuid NOT NULL REFERENCES users(id),
  claimant_org_id uuid REFERENCES organizations(id),
  respondent_org_id uuid REFERENCES organizations(id),
  respondent_user_id uuid REFERENCES users(id),
  work_order_id   uuid REFERENCES work_orders(id),
  part_order_id   uuid REFERENCES part_orders(id),
  transport_job_id uuid REFERENCES transport_jobs(id),
  escrow_hold_id  uuid REFERENCES escrow_holds(id),
  category        varchar(40) NOT NULL,                        -- scope | quality | price | delay | damage | part_defect | no_show
  description_ar  text NOT NULL,
  claimed_amount  numeric(14,2),
  resolution      dispute_resolution,
  resolution_amount_to_customer numeric(14,2),
  resolution_note_ar text,
  assigned_to     uuid REFERENCES users(id),                   -- ops mediator
  resolved_by     uuid REFERENCES users(id),
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_disputes_updated BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_disputes_status ON disputes(status, created_at);
ALTER TABLE escrow_holds    ADD CONSTRAINT fk_escrow_dispute   FOREIGN KEY (dispute_id) REFERENCES disputes(id);
ALTER TABLE warranty_claims ADD CONSTRAINT fk_wclaims_dispute  FOREIGN KEY (dispute_id) REFERENCES disputes(id);

CREATE TABLE dispute_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id),
  is_internal  boolean NOT NULL DEFAULT false,                 -- ops-only note
  body_ar      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_user_id uuid NOT NULL REFERENCES users(id),
  reviewer_org_id  uuid REFERENCES organizations(id),
  target_org_id  uuid REFERENCES organizations(id),
  target_user_id uuid REFERENCES users(id),                    -- rate a customer (by workshop) / driver
  work_order_id  uuid REFERENCES work_orders(id),
  part_order_id  uuid REFERENCES part_orders(id),
  transport_job_id uuid REFERENCES transport_jobs(id),
  rating         smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  dimensions     jsonb NOT NULL DEFAULT '{}',                  -- {price:5, quality:4, timeliness:3}
  comment_ar     text,
  is_public      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reviewer_user_id, work_order_id),
  UNIQUE (reviewer_user_id, part_order_id),
  UNIQUE (reviewer_user_id, transport_job_id)
);
CREATE INDEX idx_reviews_target_org ON reviews(target_org_id);

-- =============================================================================
-- 12. FLEET (B2B)  (module: organizations / fleet)
-- =============================================================================
CREATE TABLE fleet_policies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name_ar               varchar(120) NOT NULL,
  auto_approve_below    numeric(14,2) NOT NULL DEFAULT 0,      -- حد الاعتماد التلقائي
  requires_two_approvers_above numeric(14,2),
  allowed_org_ids       uuid[],                                -- الورش المعتمدة
  monthly_budget        numeric(14,2),
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fleet_approvals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id),
  work_order_id  uuid REFERENCES work_orders(id),
  part_order_id  uuid REFERENCES part_orders(id),
  version_id     uuid REFERENCES work_order_versions(id),
  approver_user_id uuid NOT NULL REFERENCES users(id),
  decision       varchar(10) NOT NULL,                         -- approved | rejected
  note_ar        text,
  decided_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fleet_statements (                                -- الفاتورة/الكشف الشهري الموحد
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  total         numeric(14,2) NOT NULL,
  invoice_ids   uuid[] NOT NULL,
  pdf_media_id  uuid REFERENCES media_assets(id),
  status        invoice_status NOT NULL DEFAULT 'issued',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, period_start, period_end)
);

-- =============================================================================
-- 13. NOTIFICATIONS  (module: notifications)
-- =============================================================================
CREATE TABLE notification_templates (
  code        varchar(60) PRIMARY KEY,                         -- wo.awaiting_approval, pn.issued, bid.received ...
  channel     notification_channel NOT NULL,
  title_ar    text, title_en text,
  body_ar     text NOT NULL, body_en text,
  provider_template_id varchar(80),                            -- WhatsApp approved template id
  is_active   boolean NOT NULL DEFAULT true
);

CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       notification_channel NOT NULL,
  template_code varchar(60) REFERENCES notification_templates(code),
  title_ar      text,
  body_ar       text NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}',                   -- deep link payload
  status        notification_status NOT NULL DEFAULT 'queued',
  provider_ref  varchar(120),
  sent_at       timestamptz,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL AND channel='in_app';

-- =============================================================================
-- 14. INTEGRATIONS / OUTBOX / WEBHOOKS  (module: integrations)
-- =============================================================================
CREATE TABLE job_locks (                                       -- one scheduled job runs once cluster-wide
  name         varchar(80) PRIMARY KEY,                          -- escrow.auto-release, payouts.run, parts.jobs ...
  locked_until timestamptz NOT NULL,                             -- lease: expires by itself if the holder dies
  holder       varchar(120),                                     -- instance id, for diagnosis
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox (                                          -- transactional outbox
  id             bigserial PRIMARY KEY,
  event_type     varchar(80) NOT NULL,                         -- WorkOrderApproved, InvoicePaid, PartRequestCreated ...
  aggregate_type varchar(40) NOT NULL,
  aggregate_id   uuid NOT NULL,
  payload        jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz,
  locked_until   timestamptz                                    -- claim window: one dispatcher instance owns the row until it expires
);
CREATE INDEX idx_outbox_unpublished ON outbox(id) WHERE published_at IS NULL;

CREATE TABLE integration_requests (                            -- every outbound call to a provider
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         integration_provider NOT NULL,
  operation        varchar(60) NOT NULL,                       -- nafez.create_note, zatca.clearance, psp.capture ...
  idempotency_key  varchar(160) NOT NULL UNIQUE,
  ref_table        varchar(40),
  ref_id           uuid,
  status           integration_status NOT NULL DEFAULT 'pending',
  attempts         smallint NOT NULL DEFAULT 0,
  next_attempt_at  timestamptz,
  request_payload  jsonb,                                      -- PII-redacted
  response_payload jsonb,
  http_status      integer,
  error_message    text,
  latency_ms       integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_integration_requests_updated BEFORE UPDATE ON integration_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_integration_requests_ref ON integration_requests(ref_table, ref_id);
CREATE INDEX idx_integration_requests_retry ON integration_requests(next_attempt_at) WHERE status IN ('pending','failed');

CREATE TABLE webhook_events (                                  -- inbound webhooks (inbox)
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           integration_provider NOT NULL,
  provider_event_id  varchar(160),
  event_type         varchar(80),
  signature_valid    boolean NOT NULL,
  headers            jsonb,
  payload            jsonb NOT NULL,
  processed_at       timestamptz,
  processing_error   text,
  received_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events(received_at) WHERE processed_at IS NULL;

CREATE TABLE integration_credentials (                         -- per-org provider credentials (e.g., ZATCA CSID handled in zatca_devices)
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     integration_provider NOT NULL,
  org_id       uuid REFERENCES organizations(id) ON DELETE CASCADE,
  secret_enc   bytea NOT NULL,
  metadata     jsonb NOT NULL DEFAULT '{}',
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, org_id)
);

-- =============================================================================
-- 15. AUDIT LOG  (module: audit) — append-only with hash chain
-- =============================================================================
CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_type    varchar(20) NOT NULL DEFAULT 'user',           -- user | system | webhook | admin
  org_id        uuid,
  action        varchar(80) NOT NULL,                          -- work_order.approve, invoice.issue, pn.close ...
  entity_type   varchar(40) NOT NULL,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  ip_address    inet,
  user_agent    text,
  request_id    varchar(64),
  prev_hash     char(64),
  hash          char(64) NOT NULL
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, occurred_at);
CREATE INDEX idx_audit_actor ON audit_log(actor_user_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION audit_log_guard() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_guard();

-- Same protection for legal/financial append-only tables
CREATE TRIGGER trg_ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION audit_log_guard();
CREATE TRIGGER trg_wo_versions_immutable    BEFORE UPDATE OR DELETE ON work_order_versions FOR EACH ROW EXECUTE FUNCTION audit_log_guard();
CREATE TRIGGER trg_wo_signatures_immutable  BEFORE UPDATE OR DELETE ON work_order_signatures FOR EACH ROW EXECUTE FUNCTION audit_log_guard();
CREATE TRIGGER trg_settlements_immutable    BEFORE UPDATE OR DELETE ON settlements FOR EACH ROW EXECUTE FUNCTION audit_log_guard();
CREATE TRIGGER trg_pn_events_immutable      BEFORE UPDATE OR DELETE ON promissory_note_events FOR EACH ROW EXECUTE FUNCTION audit_log_guard();

-- =============================================================================
-- 16. PLATFORM CONFIG
-- =============================================================================
CREATE TABLE platform_settings (
  key         varchar(80) PRIMARY KEY,                         -- escrow.auto_release_hours=72, abandoned.notice_days=15, bidding.default_minutes=60
  value       jsonb NOT NULL,
  updated_by  uuid REFERENCES users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE analytics_events (                                -- funnel/telemetry for the pilot (no PII)
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  event        varchar(60) NOT NULL,                           -- work_order.created, work_order.approved, invoice.paid ...
  org_id       uuid REFERENCES organizations(id),
  actor_user_id uuid REFERENCES users(id),
  entity_type  varchar(40),
  entity_id    uuid,
  industrial_zone varchar(120),                                -- denormalised so pilot cohorts survive org edits
  props        jsonb NOT NULL DEFAULT '{}',                    -- amounts/counters only — never names, phones or ids of people
  UNIQUE (event, entity_type, entity_id)                       -- one row per (event, entity): replays stay idempotent
);
CREATE INDEX idx_analytics_event_time ON analytics_events(event, occurred_at DESC);
CREATE INDEX idx_analytics_org_time ON analytics_events(org_id, occurred_at DESC);
CREATE INDEX idx_analytics_zone_time ON analytics_events(industrial_zone, occurred_at DESC);

CREATE TABLE admin_approvals (                                 -- maker/checker on sensitive admin actions (escrow refunds first)
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action             varchar(60)  NOT NULL,                    -- 'escrow.refund' today; generic by design
  entity_type        varchar(40)  NOT NULL,
  entity_id          uuid         NOT NULL,
  payload            jsonb        NOT NULL,                    -- executed verbatim at approval, revalidated then
  status             varchar(16)  NOT NULL DEFAULT 'requested',-- requested | approved | rejected | expired
  requested_by       uuid         NOT NULL REFERENCES users(id),
  requested_at       timestamptz  NOT NULL DEFAULT now(),
  decided_by         uuid REFERENCES users(id),
  decided_at         timestamptz,
  decision_reason_ar text,
  expires_at         timestamptz  NOT NULL,                    -- window from platform_settings approvals.expiry_hours
  -- the requester may withdraw their own request; nobody approves what they requested
  CONSTRAINT approvals_two_people CHECK (status <> 'approved' OR decided_by IS NULL OR decided_by <> requested_by)
);
CREATE INDEX idx_admin_approvals_pending ON admin_approvals (action, status) WHERE status = 'requested';
CREATE UNIQUE INDEX uq_admin_approvals_open_entity ON admin_approvals (action, entity_id) WHERE status = 'requested';

CREATE TABLE sequences_counters (                              -- platform-wide human numbers (WO-, PN-, PR-, ...)
  prefix      varchar(8) NOT NULL,
  year        smallint NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);

CREATE OR REPLACE FUNCTION next_number(p_prefix text) RETURNS text AS $$
DECLARE y smallint := EXTRACT(YEAR FROM now())::smallint; n integer;
BEGIN
  INSERT INTO sequences_counters(prefix, year, last_number) VALUES (p_prefix, y, 1)
    ON CONFLICT (prefix, year) DO UPDATE SET last_number = sequences_counters.last_number + 1
    RETURNING last_number INTO n;
  RETURN format('%s-%s-%s', p_prefix, y, lpad(n::text, 6, '0'));
END; $$ LANGUAGE plpgsql;

-- =============================================================================
-- END
-- =============================================================================
