ALTER TABLE employees ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS note text;
UPDATE employees SET address = '' WHERE address IS NULL;
UPDATE employees SET note = '' WHERE note IS NULL;
ALTER TABLE employees ALTER COLUMN address SET DEFAULT '';
ALTER TABLE employees ALTER COLUMN address SET NOT NULL;
ALTER TABLE employees ALTER COLUMN note SET DEFAULT '';
ALTER TABLE employees ALTER COLUMN note SET NOT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS advisory_areas text[] DEFAULT '{}' NOT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS image_url text;

DO $$ BEGIN
  ALTER TABLE employees ADD CONSTRAINT employees_age_range CHECK (age IS NULL OR (age >= 16 AND age <= 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS employee_images (
  employee_id integer PRIMARY KEY NOT NULL,
  content_type text NOT NULL,
  data bytea NOT NULL,
  digest text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE employee_images
    ADD CONSTRAINT employee_images_employee_id_employees_id_fk
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS channel text DEFAULT 'all' NOT NULL;
DO $$ BEGIN
  ALTER TABLE team_messages ADD CONSTRAINT team_messages_channel_check CHECK (channel IN ('all','admins'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS team_messages_channel_created_idx
  ON team_messages (channel, created_at DESC);
