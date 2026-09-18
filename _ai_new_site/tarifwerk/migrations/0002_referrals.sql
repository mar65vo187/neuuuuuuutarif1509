CREATE TABLE IF NOT EXISTS referrers (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  code text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS referrals (
  id serial PRIMARY KEY,
  referrer_id integer NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  lead_id integer NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  customer_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS referrals_customer_unique ON referrals(referrer_id, customer_hash);
CREATE INDEX IF NOT EXISTS referrals_referrer_created_idx ON referrals(referrer_id, created_at DESC);
