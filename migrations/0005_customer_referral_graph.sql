-- Internal customer-to-customer/lead recommendation graph ("Vitamin B").
CREATE TABLE IF NOT EXISTS customer_referrals (
  id serial PRIMARY KEY,
  source_customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referred_lead_id integer REFERENCES leads(id) ON DELETE SET NULL,
  referred_customer_id integer REFERENCES customers(id) ON DELETE SET NULL,
  relationship text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_referrals_target_check CHECK (referred_lead_id IS NOT NULL OR referred_customer_id IS NOT NULL),
  CONSTRAINT customer_referrals_no_self_check CHECK (referred_customer_id IS NULL OR source_customer_id <> referred_customer_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_referrals_lead_unique
  ON customer_referrals(referred_lead_id)
  WHERE referred_lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_referrals_customer_unique
  ON customer_referrals(referred_customer_id)
  WHERE referred_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_referrals_source_idx
  ON customer_referrals(source_customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_referrals_created_by_idx
  ON customer_referrals(created_by_employee_id, created_at DESC);
