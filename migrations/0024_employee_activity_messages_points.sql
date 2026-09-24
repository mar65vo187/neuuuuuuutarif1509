-- Employee activity oversight, personal inbox messages and commission points.
ALTER TABLE notification_queue
  ADD COLUMN IF NOT EXISTS sender_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_ack boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

CREATE INDEX IF NOT EXISTS notification_sender_created_idx
  ON notification_queue(sender_employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_employee_ack_idx
  ON notification_queue(employee_id, requires_ack, acknowledged_at, created_at DESC);

ALTER TABLE commission_list_versions
  ADD COLUMN IF NOT EXISTS source_document_id integer REFERENCES internal_documents(id) ON DELETE SET NULL;

ALTER TABLE commission_rate_versions
  ADD COLUMN IF NOT EXISTS points numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_note text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS commission_rate_points_idx
  ON commission_rate_versions(commission_list_version_id, points);

-- Lightweight contact pool: intentionally separate from the lead work queue until qualified.
CREATE TABLE IF NOT EXISTS prospect_contacts (
  id serial PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  normalized_email text,
  normalized_phone text,
  region text,
  topic text,
  preferred_channel text,
  preferred_time text,
  note text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'parked' CHECK (status IN ('parked','contacted','qualified','converted','archived')),
  owner_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  next_contact_at timestamptz,
  converted_lead_id integer REFERENCES leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_contacts_email_unique
  ON prospect_contacts(normalized_email) WHERE normalized_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS prospect_contacts_phone_unique
  ON prospect_contacts(normalized_phone) WHERE normalized_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS prospect_contacts_owner_status_idx
  ON prospect_contacts(owner_employee_id, status, next_contact_at, created_at DESC);

CREATE TABLE IF NOT EXISTS prospect_contact_product_links (
  contact_id integer NOT NULL REFERENCES prospect_contacts(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'interest',
  created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(contact_id, product_id)
);
CREATE INDEX IF NOT EXISTS prospect_contact_product_product_idx
  ON prospect_contact_product_links(product_id, created_at DESC);
