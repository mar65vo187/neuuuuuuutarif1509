-- Shared rate-limit state for public lead intake.
-- Only a one-way hash of the network key is stored; raw IP addresses are not persisted.

CREATE TABLE IF NOT EXISTS public_intake_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_intake_rate_count_check CHECK (request_count >= 0)
);

CREATE INDEX IF NOT EXISTS public_intake_rate_limits_updated_idx
  ON public_intake_rate_limits(updated_at);
