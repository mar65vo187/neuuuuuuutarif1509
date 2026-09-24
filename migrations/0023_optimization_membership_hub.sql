-- TarifWerk Optimierungsservice: wiederkehrende Kundenbeziehung, Ziele, Verträge, Angebote und Dokumente.

CREATE TABLE IF NOT EXISTS optimization_memberships (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'optimize_199',
  monthly_price_cents integer NOT NULL DEFAULT 199 CHECK (monthly_price_cents >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','cancelled')),
  owner_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  billing_provider text,
  billing_customer_ref text,
  billing_subscription_ref text,
  started_at timestamptz,
  next_billing_at timestamptz,
  next_review_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS optimization_memberships_customer_unique
  ON optimization_memberships(customer_id);
CREATE INDEX IF NOT EXISTS optimization_memberships_status_review_idx
  ON optimization_memberships(status, next_review_at);
CREATE INDEX IF NOT EXISTS optimization_memberships_owner_idx
  ON optimization_memberships(owner_employee_id, status);

CREATE TABLE IF NOT EXISTS optimization_goals (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  membership_id integer REFERENCES optimization_memberships(id) ON DELETE SET NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','researching','offers_ready','accepted','completed','cancelled')),
  target_date date,
  budget_cents integer CHECK (budget_cents IS NULL OR budget_cents >= 0),
  financing_needed boolean NOT NULL DEFAULT false,
  assigned_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_goals_customer_status_idx
  ON optimization_goals(customer_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS optimization_goals_assignee_idx
  ON optimization_goals(assigned_employee_id, status, target_date);

CREATE TABLE IF NOT EXISTS optimization_contracts (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  membership_id integer REFERENCES optimization_memberships(id) ON DELETE SET NULL,
  category text NOT NULL,
  provider_name text NOT NULL,
  contract_name text NOT NULL,
  monthly_cost_cents integer CHECK (monthly_cost_cents IS NULL OR monthly_cost_cents >= 0),
  start_date date,
  end_date date,
  notice_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','review_due','switch_planned','cancelled','expired')),
  note text NOT NULL DEFAULT '',
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_contracts_customer_status_idx
  ON optimization_contracts(customer_id, status, notice_date);
CREATE INDEX IF NOT EXISTS optimization_contracts_notice_idx
  ON optimization_contracts(notice_date) WHERE status IN ('active','review_due','switch_planned');

CREATE TABLE IF NOT EXISTS optimization_offers (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  goal_id integer REFERENCES optimization_goals(id) ON DELETE SET NULL,
  contract_id integer REFERENCES optimization_contracts(id) ON DELETE SET NULL,
  provider_name text NOT NULL,
  title text NOT NULL,
  monthly_cost_cents integer CHECK (monthly_cost_cents IS NULL OR monthly_cost_cents >= 0),
  one_time_cost_cents integer CHECK (one_time_cost_cents IS NULL OR one_time_cost_cents >= 0),
  term_months integer CHECK (term_months IS NULL OR term_months >= 0),
  position integer NOT NULL DEFAULT 1 CHECK (position BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('draft','proposed','accepted','rejected','expired')),
  valid_until date,
  note text NOT NULL DEFAULT '',
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_offers_customer_status_idx
  ON optimization_offers(customer_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS optimization_offers_goal_position_idx
  ON optimization_offers(goal_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS optimization_offers_goal_position_open_unique
  ON optimization_offers(goal_id, position)
  WHERE goal_id IS NOT NULL AND status IN ('draft','proposed');

CREATE TABLE IF NOT EXISTS optimization_documents (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  goal_id integer REFERENCES optimization_goals(id) ON DELETE SET NULL,
  contract_id integer REFERENCES optimization_contracts(id) ON DELETE SET NULL,
  offer_id integer REFERENCES optimization_offers(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'contract',
  title text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0),
  digest text NOT NULL,
  data bytea NOT NULL,
  uploaded_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_documents_customer_idx
  ON optimization_documents(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS optimization_documents_contract_idx
  ON optimization_documents(contract_id);
CREATE INDEX IF NOT EXISTS optimization_documents_goal_idx
  ON optimization_documents(goal_id);
