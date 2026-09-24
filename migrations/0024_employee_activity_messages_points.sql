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
