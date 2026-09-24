CREATE TABLE IF NOT EXISTS optimization_subscriptions (
  id serial PRIMARY KEY,
  customer_id integer REFERENCES customers(id) ON DELETE SET NULL,
  owner_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  public_token text NOT NULL UNIQUE,
  plan_code text NOT NULL DEFAULT 'optimierung_plus',
  price_cents integer NOT NULL DEFAULT 199 CHECK (price_cents > 0),
  currency text NOT NULL DEFAULT 'EUR',
  billing_provider text NOT NULL DEFAULT 'manual',
  billing_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'onboarding',
  stripe_checkout_session_id text UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text,
  started_at timestamptz,
  next_review_at timestamptz,
  canceled_at timestamptz,
  consent_terms_at timestamptz NOT NULL,
  consent_privacy_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_subscriptions_status_idx
  ON optimization_subscriptions(status, billing_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS optimization_subscriptions_owner_idx
  ON optimization_subscriptions(owner_employee_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS optimization_subscriptions_email_idx
  ON optimization_subscriptions(lower(email));
CREATE INDEX IF NOT EXISTS optimization_subscriptions_review_idx
  ON optimization_subscriptions(next_review_at)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS optimization_requests (
  id serial PRIMARY KEY,
  subscription_id integer NOT NULL REFERENCES optimization_subscriptions(id) ON DELETE CASCADE,
  customer_id integer REFERENCES customers(id) ON DELETE SET NULL,
  assigned_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  financing_wanted boolean NOT NULL DEFAULT false,
  budget_cents integer,
  target_date date,
  review_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_requests_subscription_idx
  ON optimization_requests(subscription_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS optimization_requests_work_idx
  ON optimization_requests(status, priority, review_due_at);
CREATE INDEX IF NOT EXISTS optimization_requests_assignee_idx
  ON optimization_requests(assigned_employee_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS optimization_offers (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES optimization_requests(id) ON DELETE CASCADE,
  provider_id integer REFERENCES providers(id) ON DELETE SET NULL,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 3),
  title text NOT NULL,
  monthly_cents integer,
  one_time_cents integer,
  estimated_savings_cents integer,
  term_months integer,
  highlights text[] NOT NULL DEFAULT '{}',
  limitations text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  external_reference text,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  sent_at timestamptz,
  decision_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, rank)
);

CREATE INDEX IF NOT EXISTS optimization_offers_request_idx
  ON optimization_offers(request_id, rank);

CREATE TABLE IF NOT EXISTS optimization_documents (
  id serial PRIMARY KEY,
  subscription_id integer NOT NULL REFERENCES optimization_subscriptions(id) ON DELETE CASCADE,
  request_id integer REFERENCES optimization_requests(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'contract',
  filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  digest text NOT NULL,
  data bytea NOT NULL,
  source text NOT NULL DEFAULT 'customer',
  uploaded_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_documents_subscription_idx
  ON optimization_documents(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS optimization_documents_request_idx
  ON optimization_documents(request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS optimization_events (
  id bigserial PRIMARY KEY,
  subscription_id integer NOT NULL REFERENCES optimization_subscriptions(id) ON DELETE CASCADE,
  request_id integer REFERENCES optimization_requests(id) ON DELETE CASCADE,
  actor_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS optimization_events_subscription_idx
  ON optimization_events(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS optimization_events_request_idx
  ON optimization_events(request_id, created_at DESC);

COMMENT ON TABLE optimization_subscriptions IS 'TarifWerk Optimierung+ recurring customer subscriptions.';
COMMENT ON TABLE optimization_requests IS 'Customer goals, wishes, contract reviews and project requests within Optimierung+.';
COMMENT ON TABLE optimization_offers IS 'Up to three comparable offers per optimization request.';
COMMENT ON TABLE optimization_documents IS 'Customer contract/project documents stored server-side for optimization workflows.';


CREATE TABLE IF NOT EXISTS optimization_contract_notices (
  id bigserial PRIMARY KEY,
  subscription_id integer REFERENCES optimization_subscriptions(id) ON DELETE SET NULL,
  receipt_token text NOT NULL UNIQUE,
  notice_type text NOT NULL CHECK (notice_type IN ('cancellation','withdrawal')),
  customer_name text NOT NULL,
  email text NOT NULL,
  contract_label text NOT NULL DEFAULT 'TarifWerk Optimierung+',
  cancellation_type text,
  reason text,
  requested_end text,
  status text NOT NULL DEFAULT 'received',
  billing_action text NOT NULL DEFAULT 'pending',
  confirmation_email_status text NOT NULL DEFAULT 'pending',
  confirmation_email_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS optimization_contract_notices_subscription_idx
  ON optimization_contract_notices(subscription_id, received_at DESC);
CREATE INDEX IF NOT EXISTS optimization_contract_notices_email_idx
  ON optimization_contract_notices(lower(email), received_at DESC);

COMMENT ON TABLE optimization_contract_notices IS 'Timestamped cancellation and withdrawal declarations for Optimierung+ with confirmation delivery state.';
