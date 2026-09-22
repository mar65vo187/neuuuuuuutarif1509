-- Enterprise Action Inbox: make internal notifications actionable without sending customer-facing messages.
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'automation';
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS action_url text;
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE notification_queue
SET read_at = sent_at
WHERE status = 'read' AND read_at IS NULL AND sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS notification_employee_inbox_idx
  ON notification_queue(employee_id, archived_at, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS notification_employee_snooze_idx
  ON notification_queue(employee_id, snoozed_until);
