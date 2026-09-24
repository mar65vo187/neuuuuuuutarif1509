ALTER TABLE team_messages
  ADD COLUMN IF NOT EXISTS recipient_employee_id integer;

DO $$ BEGIN
  ALTER TABLE team_messages
    ADD CONSTRAINT team_messages_recipient_employee_id_employees_id_fk
    FOREIGN KEY (recipient_employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE team_messages DROP CONSTRAINT IF EXISTS team_messages_channel_check;

ALTER TABLE team_messages
  ADD CONSTRAINT team_messages_channel_check
  CHECK (channel IN ('all', 'admins', 'direct'));

CREATE INDEX IF NOT EXISTS team_messages_direct_sender_created_idx
  ON team_messages (employee_id, created_at DESC)
  WHERE channel = 'direct';

CREATE INDEX IF NOT EXISTS team_messages_direct_recipient_created_idx
  ON team_messages (recipient_employee_id, created_at DESC)
  WHERE channel = 'direct';
