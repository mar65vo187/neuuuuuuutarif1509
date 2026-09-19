CREATE TABLE IF NOT EXISTS provider_profiles (
  provider_id integer PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  partner_type text NOT NULL DEFAULT 'provider',
  website_url text,
  portal_url text,
  contact_name text,
  contact_phone text,
  contact_email text,
  support_contact text,
  billing_path text,
  regions text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  updated_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_catalog_profiles (
  product_id integer PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'both',
  lifecycle_status text NOT NULL DEFAULT 'active',
  description text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT 'Deutschland',
  submission_url text,
  support_contact text,
  completion_process text NOT NULL DEFAULT '',
  marketing_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  marketing_conditions text NOT NULL DEFAULT '',
  sales_arguments jsonb NOT NULL DEFAULT '[]'::jsonb,
  objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  training_required boolean NOT NULL DEFAULT false,
  highlight text,
  updated_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_catalog_audience_check CHECK (audience IN ('private','business','both')),
  CONSTRAINT product_catalog_lifecycle_check CHECK (lifecycle_status IN ('active','new','test','paused','do_not_market','phasing_out','ended'))
);
CREATE INDEX IF NOT EXISTS product_catalog_status_idx ON product_catalog_profiles(lifecycle_status, updated_at);

CREATE TABLE IF NOT EXISTS commission_list_versions (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  source_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  valid_from timestamptz,
  valid_to timestamptz,
  owner_pool_percent numeric(5,2) NOT NULL DEFAULT '15.00',
  imported_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_list_owner_pool_check CHECK (owner_pool_percent = 15.00),
  CONSTRAINT commission_list_version_positive CHECK (version > 0),
  UNIQUE(provider_id, version)
);
CREATE INDEX IF NOT EXISTS commission_list_provider_idx ON commission_list_versions(provider_id, created_at);

CREATE TABLE IF NOT EXISTS commission_rate_versions (
  id serial PRIMARY KEY,
  commission_list_version_id integer NOT NULL REFERENCES commission_list_versions(id) ON DELETE CASCADE,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  external_product_id text,
  product_name text NOT NULL,
  category text NOT NULL,
  gross_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  valid_from timestamptz,
  valid_to timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_rate_amount_check CHECK (gross_amount >= 0)
);
CREATE INDEX IF NOT EXISTS commission_rate_product_idx ON commission_rate_versions(product_id, created_at);
CREATE INDEX IF NOT EXISTS commission_rate_list_idx ON commission_rate_versions(commission_list_version_id);

CREATE TABLE IF NOT EXISTS benefit_pool_ledger (
  id serial PRIMARY KEY,
  entry_type text NOT NULL,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL,
  note text NOT NULL DEFAULT '',
  reference text,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT benefit_pool_type_check CHECK (entry_type IN ('credit','spend','reserve','release','correction')),
  CONSTRAINT benefit_pool_amount_check CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS benefit_pool_ledger_created_idx ON benefit_pool_ledger(created_at);
CREATE INDEX IF NOT EXISTS benefit_pool_ledger_category_idx ON benefit_pool_ledger(category, created_at);

CREATE TABLE IF NOT EXISTS product_updates (
  id serial PRIMARY KEY,
  product_id integer REFERENCES products(id) ON DELETE CASCADE,
  provider_id integer REFERENCES providers(id) ON DELETE CASCADE,
  update_type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  important boolean NOT NULL DEFAULT false,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_updates_created_idx ON product_updates(created_at);
CREATE INDEX IF NOT EXISTS product_updates_product_idx ON product_updates(product_id, created_at);

INSERT INTO product_catalog_profiles (product_id)
SELECT id FROM products
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO provider_profiles (provider_id)
SELECT id FROM providers
ON CONFLICT (provider_id) DO NOTHING;
