-- Portal security hardening: revocable server-side sessions and shared login throttling.

CREATE TABLE IF NOT EXISTS portal_sessions (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  credential_signature text NOT NULL,
  mfa_verified boolean NOT NULL DEFAULT false,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS portal_sessions_employee_idx
  ON portal_sessions(employee_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS portal_sessions_expiry_idx
  ON portal_sessions(expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS portal_login_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_login_rate_count_check CHECK (request_count >= 0)
);

CREATE INDEX IF NOT EXISTS portal_login_rate_limits_updated_idx
  ON portal_login_rate_limits(updated_at);
