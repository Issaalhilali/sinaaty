-- خدمات الورشة المحفوظة — «غيار زيت 280» بنقرةٍ بدل كتابته كل مرة.
CREATE TABLE IF NOT EXISTS org_service_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name_ar       varchar(200) NOT NULL,
  item_type     wo_item_type NOT NULL DEFAULT 'labor',
  unit_price    numeric(12,2) NOT NULL,
  warranty_days int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_service_items_org ON org_service_items(org_id) WHERE is_active;
