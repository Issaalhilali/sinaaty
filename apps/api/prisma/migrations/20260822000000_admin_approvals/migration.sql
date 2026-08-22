-- Maker/checker on escrow refunds (backlog item 30, design: docs/design/maker-checker-refunds.md).
-- Generic approvals table: the requester can withdraw their own request, but NOBODY approves what
-- they requested — and the database re-checks that, not just the code (same philosophy as the ledger).
CREATE TABLE IF NOT EXISTS admin_approvals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action             varchar(60)  NOT NULL,
  entity_type        varchar(40)  NOT NULL,
  entity_id          uuid         NOT NULL,
  payload            jsonb        NOT NULL,
  status             varchar(16)  NOT NULL DEFAULT 'requested',
  requested_by       uuid         NOT NULL REFERENCES users(id),
  requested_at       timestamptz  NOT NULL DEFAULT now(),
  decided_by         uuid REFERENCES users(id),
  decided_at         timestamptz,
  decision_reason_ar text,
  expires_at         timestamptz  NOT NULL,
  CONSTRAINT approvals_two_people CHECK (status <> 'approved' OR decided_by IS NULL OR decided_by <> requested_by)
);
CREATE INDEX IF NOT EXISTS idx_admin_approvals_pending ON admin_approvals (action, status) WHERE status = 'requested';
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_approvals_open_entity ON admin_approvals (action, entity_id) WHERE status = 'requested';
