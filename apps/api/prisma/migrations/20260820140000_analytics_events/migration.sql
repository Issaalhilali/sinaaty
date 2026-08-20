-- Step 25 (pilot config): a small, PII-free event stream behind the funnel dashboards.
-- Unique per (event, entity) so an outbox replay cannot double-count a step of the funnel.
CREATE TABLE IF NOT EXISTS analytics_events (
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  event        varchar(60) NOT NULL,
  org_id       uuid REFERENCES organizations(id),
  actor_user_id uuid REFERENCES users(id),
  entity_type  varchar(40),
  entity_id    uuid,
  industrial_zone varchar(120),
  props        jsonb NOT NULL DEFAULT '{}',
  UNIQUE (event, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_analytics_event_time ON analytics_events(event, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_org_time ON analytics_events(org_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_zone_time ON analytics_events(industrial_zone, occurred_at DESC);
