CREATE TABLE IF NOT EXISTS incentive_campaigns (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  goal_type text NOT NULL DEFAULT 'orders',
  goal_value numeric(12,2) NOT NULL,
  reward_type text NOT NULL DEFAULT 'bonus',
  reward_description text NOT NULL,
  budget numeric(12,2),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  active boolean NOT NULL DEFAULT true,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incentive_goal_type_check CHECK (goal_type IN ('orders','commission','team_orders')),
  CONSTRAINT incentive_goal_value_check CHECK (goal_value > 0),
  CONSTRAINT incentive_budget_check CHECK (budget IS NULL OR budget >= 0),
  CONSTRAINT incentive_dates_check CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS incentive_campaign_active_idx ON incentive_campaigns(active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS training_modules (
  id serial PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  required boolean NOT NULL DEFAULT false,
  valid_months integer,
  active boolean NOT NULL DEFAULT true,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_valid_months_check CHECK (valid_months IS NULL OR valid_months BETWEEN 1 AND 120)
);
CREATE INDEX IF NOT EXISTS training_module_product_idx ON training_modules(product_id, active);

CREATE TABLE IF NOT EXISTS employee_training_completions (
  id serial PRIMARY KEY,
  module_id integer NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  completed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  recorded_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_completion_status_check CHECK (status IN ('completed','revoked')),
  UNIQUE(module_id, employee_id)
);
CREATE INDEX IF NOT EXISTS employee_training_employee_idx ON employee_training_completions(employee_id, status, expires_at);

CREATE TABLE IF NOT EXISTS employee_benefits (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  benefit_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'eligible',
  details text NOT NULL DEFAULT '',
  valid_from timestamptz,
  valid_to timestamptz,
  updated_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_benefit_status_check CHECK (status IN ('eligible','active','paused','ended')),
  UNIQUE(employee_id, benefit_key)
);
CREATE INDEX IF NOT EXISTS employee_benefit_employee_idx ON employee_benefits(employee_id, status);

CREATE TABLE IF NOT EXISTS internal_documents (
  id serial PRIMARY KEY,
  category text NOT NULL,
  title text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  data bytea NOT NULL,
  digest text NOT NULL,
  size_bytes integer NOT NULL,
  version integer NOT NULL DEFAULT 1,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  provider_id integer REFERENCES providers(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'team',
  active boolean NOT NULL DEFAULT true,
  uploaded_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT internal_document_size_check CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  CONSTRAINT internal_document_version_check CHECK (version > 0),
  CONSTRAINT internal_document_visibility_check CHECK (visibility IN ('team','admin','owner'))
);
CREATE INDEX IF NOT EXISTS internal_documents_category_idx ON internal_documents(category, active, created_at);
CREATE INDEX IF NOT EXISTS internal_documents_product_idx ON internal_documents(product_id, active, created_at);

CREATE TABLE IF NOT EXISTS reconciliation_imports (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  source_name text NOT NULL,
  row_count integer NOT NULL,
  matched_count integer NOT NULL DEFAULT 0,
  issue_count integer NOT NULL DEFAULT 0,
  imported_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reconciliation_import_counts_check CHECK (row_count >= 0 AND matched_count >= 0 AND issue_count >= 0)
);
CREATE INDEX IF NOT EXISTS reconciliation_import_provider_idx ON reconciliation_imports(provider_id, created_at);
