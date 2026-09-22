-- Enterprise Service Case Management
-- Service, Reklamationen und Providerfälle werden getrennt vom Vertriebsstatus geführt.

CREATE TABLE IF NOT EXISTS service_cases (
  id serial PRIMARY KEY,
  case_number text NOT NULL UNIQUE,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_id integer REFERENCES orders(id) ON DELETE SET NULL,
  owner_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution text,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_cases_type_check CHECK (type IN ('general','complaint','provider_issue','billing','cancellation','documents','technical')),
  CONSTRAINT service_cases_status_check CHECK (status IN ('open','in_progress','waiting_customer','waiting_provider','resolved','closed')),
  CONSTRAINT service_cases_priority_check CHECK (priority IN ('low','normal','high','critical'))
);
CREATE INDEX IF NOT EXISTS service_cases_owner_status_due_idx ON service_cases(owner_employee_id, status, due_at);
CREATE INDEX IF NOT EXISTS service_cases_customer_idx ON service_cases(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_cases_order_idx ON service_cases(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_cases_status_due_idx ON service_cases(status, due_at);

CREATE TABLE IF NOT EXISTS service_case_events (
  id serial PRIMARY KEY,
  service_case_id integer NOT NULL REFERENCES service_cases(id) ON DELETE CASCADE,
  actor_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  type text NOT NULL,
  from_value text,
  to_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_case_events_case_idx ON service_case_events(service_case_id, created_at DESC);

ALTER TABLE operations_policy ADD COLUMN IF NOT EXISTS service_critical_hours integer NOT NULL DEFAULT 4;
ALTER TABLE operations_policy ADD COLUMN IF NOT EXISTS service_high_hours integer NOT NULL DEFAULT 24;
ALTER TABLE operations_policy ADD COLUMN IF NOT EXISTS service_normal_hours integer NOT NULL DEFAULT 72;
ALTER TABLE operations_policy ADD COLUMN IF NOT EXISTS service_low_hours integer NOT NULL DEFAULT 120;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_policy_service_critical_check') THEN
    ALTER TABLE operations_policy ADD CONSTRAINT operations_policy_service_critical_check CHECK (service_critical_hours BETWEEN 1 AND 168);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_policy_service_high_check') THEN
    ALTER TABLE operations_policy ADD CONSTRAINT operations_policy_service_high_check CHECK (service_high_hours BETWEEN 1 AND 336);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_policy_service_normal_check') THEN
    ALTER TABLE operations_policy ADD CONSTRAINT operations_policy_service_normal_check CHECK (service_normal_hours BETWEEN 1 AND 720);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_policy_service_low_check') THEN
    ALTER TABLE operations_policy ADD CONSTRAINT operations_policy_service_low_check CHECK (service_low_hours BETWEEN 1 AND 1440);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_policy_service_order_check') THEN
    ALTER TABLE operations_policy ADD CONSTRAINT operations_policy_service_order_check CHECK (
      service_critical_hours <= service_high_hours
      AND service_high_hours <= service_normal_hours
      AND service_normal_hours <= service_low_hours
    );
  END IF;
END $$;

INSERT INTO permissions(key, description) VALUES
  ('service.read','Servicefälle lesen'),
  ('service.edit','Servicefälle bearbeiten'),
  ('service.assign','Servicefälle unternehmensweit zuweisen')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r CROSS JOIN permissions p
WHERE r.key IN ('super_admin','management')
  AND p.key IN ('service.read','service.edit','service.assign')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN ('service.read','service.edit','service.assign')
WHERE r.key IN ('sales_admin','backoffice')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN ('service.read','service.edit')
WHERE r.key IN ('team_lead','advisor')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key = 'service.read'
WHERE r.key = 'quality'
ON CONFLICT DO NOTHING;
