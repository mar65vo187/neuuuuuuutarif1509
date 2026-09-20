-- First-party marketing spend ledger for campaign cost control.
CREATE TABLE IF NOT EXISTS marketing_campaign_spend (
  id serial PRIMARY KEY,
  campaign_key text NOT NULL,
  source text NOT NULL,
  medium text NOT NULL DEFAULT '',
  amount_cents integer NOT NULL,
  spent_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL DEFAULT '',
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaign_spend_amount_check CHECK (amount_cents > 0),
  CONSTRAINT marketing_campaign_spend_campaign_check CHECK (length(campaign_key) BETWEEN 2 AND 120),
  CONSTRAINT marketing_campaign_spend_source_check CHECK (length(source) BETWEEN 2 AND 80)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_spend_period_idx
  ON marketing_campaign_spend(spent_at, campaign_key);

CREATE INDEX IF NOT EXISTS marketing_campaign_spend_source_idx
  ON marketing_campaign_spend(source, spent_at);
