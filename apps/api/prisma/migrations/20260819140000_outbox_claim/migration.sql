-- Outbox claiming: with more than one API replica (Helm runs 2), every instance polled the same rows and
-- could call an external provider twice before either recorded its attempt. Rows are now claimed atomically
-- with FOR UPDATE SKIP LOCKED and a short lease that expires if the instance dies mid-flight.
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS locked_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_outbox_claimable ON outbox (id) WHERE published_at IS NULL;
