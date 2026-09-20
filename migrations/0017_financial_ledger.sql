-- Immutable finance journal.
-- Current-state tables may continue to serve dashboards; every material money event is appended here.

CREATE TABLE IF NOT EXISTS financial_ledger_entries (
  id serial PRIMARY KEY,
  source_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  scope text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  order_id integer REFERENCES orders(id) ON DELETE RESTRICT,
  employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  actor_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  amount numeric(14,2),
  currency text NOT NULL DEFAULT 'EUR',
  effect text NOT NULL DEFAULT 'none',
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_ledger_effect_check CHECK (effect IN ('increase','decrease','none')),
  CONSTRAINT financial_ledger_scope_check CHECK (scope IN ('provider','company','employee','growth_pool','reconciliation'))
);

CREATE INDEX IF NOT EXISTS financial_ledger_order_idx
  ON financial_ledger_entries(order_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS financial_ledger_employee_idx
  ON financial_ledger_entries(employee_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS financial_ledger_event_idx
  ON financial_ledger_entries(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS financial_ledger_created_idx
  ON financial_ledger_entries(created_at DESC);

CREATE OR REPLACE FUNCTION prevent_financial_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'financial_ledger_entries is append-only';
END;
$$;

DROP TRIGGER IF EXISTS financial_ledger_no_update ON financial_ledger_entries;
CREATE TRIGGER financial_ledger_no_update
BEFORE UPDATE ON financial_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_financial_ledger_mutation();

DROP TRIGGER IF EXISTS financial_ledger_no_delete ON financial_ledger_entries;
CREATE TRIGGER financial_ledger_no_delete
BEFORE DELETE ON financial_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_financial_ledger_mutation();
