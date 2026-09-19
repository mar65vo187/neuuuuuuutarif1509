ALTER TABLE benefit_pool_ledger
  ADD COLUMN IF NOT EXISTS source_key text;

CREATE UNIQUE INDEX IF NOT EXISTS benefit_pool_ledger_source_key_unique
  ON benefit_pool_ledger(source_key);
