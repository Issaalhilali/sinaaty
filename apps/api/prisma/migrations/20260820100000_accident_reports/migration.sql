-- Step 21 — accident reports (منجز/تقدير). The provider contract is unconfirmed (PRD risk R3), so the
-- table stores what a workshop needs to work from: the damages list, the insurer's approved amount and
-- the customer's deductible, plus the reference we send back when the repair report is registered.
DO $$ BEGIN
  CREATE TYPE accident_report_status AS ENUM ('reported','under_assessment','assessed','approved','rejected','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS accident_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       varchar(30) NOT NULL DEFAULT 'monjez',
  external_ref   varchar(80) NOT NULL,
  vehicle_id     uuid REFERENCES vehicles(id),
  work_order_id  uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  org_id         uuid REFERENCES organizations(id),
  status         accident_report_status NOT NULL DEFAULT 'reported',
  accident_at    timestamptz,
  location_ar    varchar(200),
  plate_snapshot varchar(20),
  vin_snapshot   varchar(17),
  fault_percent  numeric(5,2),
  insurer_name_ar varchar(120),
  policy_no      varchar(60),
  claim_no       varchar(60),
  deductible_amount numeric(14,2),
  approved_amount numeric(14,2),
  damages        jsonb NOT NULL DEFAULT '[]',
  repair_submission_ref varchar(80),
  repair_submitted_at timestamptz,
  raw            jsonb NOT NULL DEFAULT '{}',
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_ref)
);
DO $$ BEGIN
  CREATE TRIGGER trg_accident_reports_updated BEFORE UPDATE ON accident_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_accident_reports_wo ON accident_reports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_vehicle ON accident_reports(vehicle_id, accident_at DESC);
