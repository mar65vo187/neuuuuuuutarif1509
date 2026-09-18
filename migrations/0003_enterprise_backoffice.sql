-- TarifWerk enterprise backoffice foundation.
-- Idempotent so it can be applied by the migration runner or runtime bootstrap.
CREATE TABLE IF NOT EXISTS customers (
  id serial PRIMARY KEY,
  customer_number text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'private',
  first_name text,
  last_name text,
  company_name text,
  email text,
  phone text,
  mobile text,
  street text,
  house_number text,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'DE',
  date_of_birth text,
  preferred_channel text,
  owner_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_from_lead_id integer REFERENCES leads(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_owner_idx ON customers(owner_employee_id);
CREATE INDEX IF NOT EXISTS customers_created_idx ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS customers_email_lower_idx ON customers(lower(email));
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);

CREATE TABLE IF NOT EXISTS customer_lead_links (
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_lead_unique ON customer_lead_links(customer_id, lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS lead_customer_unique ON customer_lead_links(lead_id);

CREATE TABLE IF NOT EXISTS customer_consents (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  granted boolean NOT NULL,
  source text,
  proof jsonb,
  recorded_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_consents_customer_idx ON customer_consents(customer_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS providers (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  external_partner_id text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS providers_name_category_unique ON providers(name, category);

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  category text NOT NULL,
  name text NOT NULL,
  sku text,
  active boolean NOT NULL DEFAULT true,
  expected_commission numeric(12,2),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_provider_idx ON products(provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS products_provider_name_unique ON products(provider_id, name);

CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  lead_id integer REFERENCES leads(id) ON DELETE SET NULL,
  provider_id integer NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  advisor_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  provider_status text,
  external_order_id text,
  expected_commission numeric(12,2),
  currency text NOT NULL DEFAULT 'EUR',
  submitted_at timestamptz,
  accepted_at timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_provider_idx ON orders(provider_id);
CREATE INDEX IF NOT EXISTS orders_advisor_idx ON orders(advisor_employee_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_external_unique ON orders(provider_id, external_order_id) WHERE external_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_status_history (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  provider_status text,
  note text,
  actor_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_history_order_idx ON order_status_history(order_id, created_at);

CREATE TABLE IF NOT EXISTS commission_events (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'sale',
  status text NOT NULL DEFAULT 'expected',
  expected_amount numeric(12,2),
  confirmed_amount numeric(12,2),
  paid_amount numeric(12,2),
  provider_reference text,
  period text,
  due_date timestamptz,
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commission_order_idx ON commission_events(order_id);
CREATE INDEX IF NOT EXISTS commission_employee_idx ON commission_events(employee_id);
CREATE INDEX IF NOT EXISTS commission_status_idx ON commission_events(status, due_date);

CREATE TABLE IF NOT EXISTS tasks (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id integer NOT NULL,
  assigned_to_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'follow_up',
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks(assigned_to_employee_id, status, due_at);
CREATE INDEX IF NOT EXISTS tasks_entity_idx ON tasks(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id serial PRIMARY KEY,
  actor_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  request_id text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_events(actor_employee_id, created_at DESC);

CREATE TABLE IF NOT EXISTS automation_rules (
  id serial PRIMARY KEY,
  name text NOT NULL,
  event_type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id serial PRIMARY KEY,
  rule_id integer REFERENCES automation_rules(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  status text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS automation_runs_created_idx ON automation_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id serial PRIMARY KEY,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events(status, available_at);

CREATE TABLE IF NOT EXISTS notification_queue (
  id serial PRIMARY KEY,
  employee_id integer REFERENCES employees(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app',
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_pending_idx ON notification_queue(status, scheduled_at);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id serial PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  secret_hash text,
  event_types text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id serial PRIMARY KEY,
  endpoint_id integer NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  outbox_event_id integer REFERENCES outbox_events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  response_code integer,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_delivery_pending_idx ON webhook_deliveries(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS reconciliation_issues (
  id serial PRIMARY KEY,
  order_id integer REFERENCES orders(id) ON DELETE SET NULL,
  provider_id integer REFERENCES providers(id) ON DELETE SET NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  expected_amount numeric(12,2),
  reported_amount numeric(12,2),
  difference_amount numeric(12,2),
  reference text,
  note text,
  assigned_to_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reconciliation_status_idx ON reconciliation_issues(status, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_views (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  area text NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS saved_views_employee_name_unique ON saved_views(employee_id, area, name);

CREATE TABLE IF NOT EXISTS data_requests (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  completed_at timestamptz,
  handled_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  note text
);
CREATE INDEX IF NOT EXISTS data_requests_status_idx ON data_requests(status, due_at);

CREATE TABLE IF NOT EXISTS document_records (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id integer NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  storage_key text NOT NULL,
  digest text NOT NULL,
  size_bytes integer NOT NULL,
  uploaded_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_entity_idx ON document_records(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS teams (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  lead_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS team_member_unique ON team_members(team_id, employee_id);

CREATE TABLE IF NOT EXISTS role_definitions (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  description text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id serial PRIMARY KEY,
  role_id integer NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE,
  permission_id integer NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS role_permission_unique ON role_permissions(role_id, permission_id);

CREATE TABLE IF NOT EXISTS employee_role_assignments (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id integer NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS employee_role_assignment_unique ON employee_role_assignments(employee_id, role_id);

CREATE TABLE IF NOT EXISTS mfa_credentials (
  employee_id integer PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  secret_encrypted text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  recovery_codes_hash jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  enabled_at timestamptz,
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS login_events (
  id serial PRIMARY KEY,
  employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  email_hash text NOT NULL,
  success boolean NOT NULL,
  reason text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_events_employee_idx ON login_events(employee_id, created_at DESC);

INSERT INTO permissions(key, description) VALUES
 ('lead.read.all','Alle Leads lesen'),
 ('lead.read.team','Team-Leads lesen'),
 ('lead.edit','Leads bearbeiten'),
 ('lead.assign','Leads zuweisen'),
 ('customer.read','Kunden lesen'),
 ('customer.edit','Kunden bearbeiten'),
 ('customer.export','Kundendaten exportieren'),
 ('order.read','Aufträge lesen'),
 ('order.create','Aufträge anlegen'),
 ('order.edit','Aufträge bearbeiten'),
 ('order.cancel','Aufträge stornieren'),
 ('commission.read.self','Eigene Provision lesen'),
 ('commission.read.team','Team-Provision lesen'),
 ('commission.read.all','Alle Provisionen lesen'),
 ('commission.adjust','Provisionen korrigieren'),
 ('task.manage','Aufgaben verwalten'),
 ('report.sales','Vertriebsreporting lesen'),
 ('report.finance','Finanzreporting lesen'),
 ('employee.manage','Mitarbeiter verwalten'),
 ('audit.read','Audit-Log lesen'),
 ('automation.manage','Automationen verwalten'),
 ('integration.manage','Integrationen verwalten'),
 ('privacy.manage','Datenschutzanfragen verwalten')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_definitions(key, name, description, system) VALUES
 ('super_admin','Super Admin','Voller Systemzugriff',true),
 ('management','Geschäftsführung','Unternehmensweite Steuerung',true),
 ('sales_admin','Sales Admin','Vertrieb und Zuordnung',true),
 ('team_lead','Teamleiter','Teamsteuerung',true),
 ('advisor','Berater','Eigene Leads, Kunden und Aufträge',true),
 ('backoffice','Backoffice','Auftragsbearbeitung',true),
 ('finance','Finance','Provision und Abgleich',true),
 ('quality','Qualitätsmanagement','Qualität und Audit',true),
 ('recruiting','Recruiting','Bewerbungen und Mitarbeiterprozesse',true),
 ('read_only','Read Only','Nur Leserechte',true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r CROSS JOIN permissions p
WHERE r.key IN ('super_admin','management')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN
 ('lead.read.all','lead.edit','lead.assign','customer.read','customer.edit','order.read','order.create','order.edit','task.manage','report.sales')
WHERE r.key = 'sales_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN
 ('lead.read.team','lead.edit','lead.assign','customer.read','customer.edit','order.read','order.create','order.edit','task.manage','report.sales','commission.read.team')
WHERE r.key = 'team_lead'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN
 ('lead.edit','customer.read','customer.edit','order.read','order.create','order.edit','task.manage','commission.read.self')
WHERE r.key = 'advisor'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN
 ('lead.read.all','lead.edit','customer.read','customer.edit','order.read','order.create','order.edit','task.manage')
WHERE r.key = 'backoffice'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN
 ('customer.read','order.read','commission.read.all','commission.adjust','report.finance')
WHERE r.key = 'finance'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM role_definitions r JOIN permissions p ON p.key IN
 ('lead.read.all','customer.read','order.read','audit.read','report.sales')
WHERE r.key = 'quality'
ON CONFLICT DO NOTHING;

INSERT INTO automation_rules(name,event_type,active,conditions,actions)
SELECT 'Neuen Lead nachfassen','lead.created',true,'{}'::jsonb,
       '[{"type":"task","title":"Erstkontakt durchführen","dueMinutes":30}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM automation_rules WHERE name='Neuen Lead nachfassen');

INSERT INTO automation_rules(name,event_type,active,conditions,actions)
SELECT 'Nach bestätigtem Termin nachfassen','lead.status.termin_bestaetigt',true,'{}'::jsonb,
       '[{"type":"task","title":"Termin vorbereiten","dueMinutes":720}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM automation_rules WHERE name='Nach bestätigtem Termin nachfassen');
