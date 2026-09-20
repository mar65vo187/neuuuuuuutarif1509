ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS contact_outcome text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS leads_next_action_idx
  ON leads(next_action_at)
  WHERE next_action_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_priority_status_idx
  ON leads(priority, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS lead_product_links (
  lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'interest',
  note text NOT NULL DEFAULT '',
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_product_relation_unique
  ON lead_product_links(lead_id, product_id, relation);

CREATE INDEX IF NOT EXISTS lead_product_lead_idx
  ON lead_product_links(lead_id, relation);

CREATE INDEX IF NOT EXISTS lead_product_product_idx
  ON lead_product_links(product_id, relation);
