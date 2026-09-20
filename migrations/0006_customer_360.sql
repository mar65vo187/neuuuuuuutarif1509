-- Customer 360 CRM layer: relationship profile, customer activities and explicit opportunities.

CREATE TABLE IF NOT EXISTS customer_crm_profiles (
  customer_id integer PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  lifecycle_stage text NOT NULL DEFAULT 'active',
  relationship_status text NOT NULL DEFAULT 'new',
  risk_level text NOT NULL DEFAULT 'normal',
  next_review_at timestamptz,
  last_contact_at timestamptz,
  last_contact_channel text,
  note text NOT NULL DEFAULT '',
  updated_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_crm_lifecycle_check CHECK (lifecycle_stage IN ('prospect','active','retention','dormant','closed')),
  CONSTRAINT customer_crm_relationship_check CHECK (relationship_status IN ('new','developing','established','at_risk','inactive')),
  CONSTRAINT customer_crm_risk_check CHECK (risk_level IN ('low','normal','high','critical'))
);

CREATE INDEX IF NOT EXISTS customer_crm_review_idx
  ON customer_crm_profiles(next_review_at)
  WHERE next_review_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_activities (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  type text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  outcome text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  next_action_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_activity_type_check CHECK (type IN ('note','call','email','whatsapp','meeting','review')),
  CONSTRAINT customer_activity_direction_check CHECK (direction IN ('outbound','inbound','internal'))
);

CREATE INDEX IF NOT EXISTS customer_activities_customer_idx
  ON customer_activities(customer_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS customer_activities_next_action_idx
  ON customer_activities(next_action_at)
  WHERE next_action_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_opportunities (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  source text NOT NULL DEFAULT 'manual',
  note text NOT NULL DEFAULT '',
  next_review_at timestamptz,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_opportunity_status_check CHECK (status IN ('open','qualified','won','lost','later')),
  CONSTRAINT customer_opportunity_priority_check CHECK (priority IN ('low','normal','high','critical'))
);

CREATE INDEX IF NOT EXISTS customer_opportunities_customer_idx
  ON customer_opportunities(customer_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS customer_opportunities_review_idx
  ON customer_opportunities(next_review_at)
  WHERE next_review_at IS NOT NULL;
