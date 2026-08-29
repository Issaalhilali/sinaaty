-- سوق طلبات الإصلاح (owner directive 2026-08-22): the customer posts the problem, nearby workshops
-- answer with a diagnosis + estimate + availability, acceptance becomes a work order. Mirrors the
-- proven part_requests marketplace shape. FR-WO-01's «من العميل (طلب خدمة)» finally gets its market.
CREATE TABLE IF NOT EXISTS service_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number            varchar(24) NOT NULL UNIQUE,
  customer_user_id  uuid NOT NULL REFERENCES users(id),
  vehicle_id        uuid REFERENCES vehicles(id),
  title_ar          varchar(200) NOT NULL,
  description_ar    text,
  geo               geography(Point,4326) NOT NULL,
  address_hint      varchar(300),
  radius_km         integer NOT NULL DEFAULT 15 CHECK (radius_km BETWEEN 2 AND 150),
  preferred_time    varchar(16) NOT NULL DEFAULT 'today',
  status            varchar(16) NOT NULL DEFAULT 'open',
  accepted_offer_id uuid,
  work_order_id     uuid REFERENCES work_orders(id),
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  CREATE TRIGGER trg_service_requests_updated BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_geo ON service_requests USING gist(geo);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests(customer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS service_request_recipients (
  request_id   uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations(id),
  distance_km  numeric(6,2),
  notified_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, org_id)
);

CREATE TABLE IF NOT EXISTS service_offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  org_id         uuid NOT NULL REFERENCES organizations(id),
  offer_type     varchar(16) NOT NULL DEFAULT 'estimate',      -- estimate | free_inspection («معاينة مجانية» نوع صريح لا سعر صفري)
  diagnosis_ar   text,
  price_min      numeric(14,2),
  price_max      numeric(14,2),
  availability   varchar(16) NOT NULL DEFAULT 'today',
  available_at   timestamptz,                                  -- «اليوم ٤ عصراً» — الجاهزية نصف القرار
  eta_note_ar    varchar(200),
  status         varchar(16) NOT NULL DEFAULT 'submitted',
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (price_min IS NULL OR price_min >= 0),
  CHECK (price_max IS NULL OR price_min IS NULL OR price_max >= price_min),
  UNIQUE (request_id, org_id)
);
DO $$ BEGIN
  CREATE TRIGGER trg_service_offers_updated BEFORE UPDATE ON service_offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_service_offers_request ON service_offers(request_id, status);
DO $$ BEGIN
  ALTER TABLE service_requests ADD CONSTRAINT fk_sr_accepted_offer FOREIGN KEY (accepted_offer_id) REFERENCES service_offers(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
