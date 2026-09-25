-- Scheduled jobs ran in every API replica (Helm runs 2), so escrow auto-release, payouts, bidding expiry and
-- part-order auto-confirm each fired twice per tick. A lease row makes exactly one instance run a job.
-- A lease is used rather than pg_advisory_lock because Prisma pools connections: an advisory lock taken on one
-- connection cannot be released reliably from another, so the lock would leak until the pool recycled it.
CREATE TABLE IF NOT EXISTS job_locks (
  name         varchar(80) PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  holder       varchar(120),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
