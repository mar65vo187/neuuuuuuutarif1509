-- Pipeline forecast and loss analysis on leads.
-- All columns are optional: existing leads stay valid, the forecast only counts
-- leads that carry a value.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deal_value_cents integer,
  ADD COLUMN IF NOT EXISTS win_probability smallint,
  ADD COLUMN IF NOT EXISTS expected_close_at date,
  ADD COLUMN IF NOT EXISTS lost_reason text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_deal_value_cents_range') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_deal_value_cents_range
      CHECK (deal_value_cents IS NULL OR (deal_value_cents >= 0 AND deal_value_cents <= 1000000000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_win_probability_range') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_win_probability_range
      CHECK (win_probability IS NULL OR (win_probability >= 0 AND win_probability <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_lost_reason_known') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_lost_reason_known
      CHECK (lost_reason IS NULL OR lost_reason IN ('price', 'competitor', 'no_need', 'unreachable', 'timing', 'not_eligible', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leads_forecast_idx
  ON leads(status, expected_close_at);
